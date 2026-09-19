# Skill: React Data Fetching Patterns

## Purpose

Provides the engineering pattern for **fetching, displaying, and mutating server data** in React components using the `useState` + `useCallback` + `useEffect` triad, with exhaustive handling of loading, error, empty, and success states.

## When to Use

- You are fetching data from an API or database on component mount.
- You need to handle loading spinners, error messages, empty states, and retry mechanisms.
- You are building CRUD interfaces (Create, Read, Update, Delete) with optimistic feedback.
- You are not using a dedicated data-fetching library (React Query, SWR, Apollo).

## When NOT to Use

- You are already using React Query, SWR, or similar — they handle loading/error/caching automatically.
- The data is static and known at build time — use static imports or generated data.
- The data comes from a parent component via props — no fetching needed.

## Prerequisites

- Understanding of React hooks: `useState`, `useEffect`, `useCallback`, `useRef`.
- Understanding of async/await and error handling in JavaScript.
- Familiarity with your data source API (REST, GraphQL, Supabase, etc.).

## Core Principles

1. **Three-state model.** Every data fetch has three possible outcomes: **loading**, **error**, or **success** (which includes **empty** as a sub-state). Every component must handle all three.
2. **Fetch function as `useCallback`.** Wrapping the fetch logic in `useCallback` makes it stable for dependency arrays and enables retry.
3. **Trigger on mount via `useEffect`.** The effect calls the memoised fetch function and runs once (or when dependencies change).
4. **Dedicated sub-components.** Loading, error, and empty states should be their own components — not inline conditional JSX — for clarity and reusability.
5. **Refresh after mutation.** After any create/update/delete operation, re-fetch the list to ensure consistency.

## General Pattern

### 1. Component State

```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

### 2. Fetch Function

```javascript
const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const { data, error: fetchErr } = await apiClient
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;
    setData(data ?? []);
  } catch (err) {
    setError(err.message || 'Failed to load data.');
  } finally {
    setLoading(false);
  }
}, []);
```

### 3. Effect Trigger

```javascript
useEffect(() => {
  fetchData();
}, [fetchData]);
```

### 4. Render with State Handling

```jsx
return (
  <div>
    {loading && <LoadingState />}
    {!loading && error && <ErrorState message={error} onRetry={fetchData} />}
    {!loading && !error && data.length === 0 && <EmptyState />}
    {!loading && !error && data.length > 0 && (
      <DataGrid items={data} />
    )}
  </div>
);
```

### 5. State Sub-Components

```jsx
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner />
      <p>Loading…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-24">
      <ErrorIcon />
      <h3>Unable to load data</h3>
      <p>{message}</p>
      <button onClick={onRetry}>Try Again</button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <EmptyIcon />
      <h3>No items yet</h3>
      <p>Your collection is empty. Add your first item to get started.</p>
    </div>
  );
}
```

### 6. CRUD Mutation Pattern

```javascript
const handleSubmit = async (formData) => {
  setSubmitLoading(true);
  setSubmitError(null);

  try {
    // Validate
    if (!formData.name.trim()) {
      setSubmitError('Name is required.');
      return;
    }

    // Mutate
    if (editingItem) {
      const { error } = await apiClient
        .from('items')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingItem.id);
      if (error) throw error;
    } else {
      const { error } = await apiClient.from('items').insert([formData]);
      if (error) throw error;
    }

    // Success feedback + refresh
    setSubmitSuccess(true);
    await fetchData(); // Re-fetch the list
    setTimeout(() => {
      setShowForm(false);
      setSubmitSuccess(false);
    }, 1500);
  } catch (err) {
    setSubmitError(err.message || 'Operation failed.');
  } finally {
    setSubmitLoading(false);
  }
};
```

### 7. Delete with Confirmation

```javascript
// State
const [confirmDelete, setConfirmDelete] = useState(null);  // { id, name } or null
const [deleteLoading, setDeleteLoading] = useState(false);

// Request → shows confirmation dialog
const handleDeleteRequest = (item) => setConfirmDelete({ id: item.id, name: item.name });

// Cancel
const handleDeleteCancel = () => {
  if (deleteLoading) return; // Prevent closing during deletion
  setConfirmDelete(null);
};

// Confirm → executes deletion
const handleDeleteConfirm = async () => {
  setDeleteLoading(true);
  try {
    const { error } = await apiClient.from('items').delete().eq('id', confirmDelete.id);
    if (error) throw error;
    setConfirmDelete(null);
    await fetchData();
  } catch (err) {
    setDeleteError(err.message);
  } finally {
    setDeleteLoading(false);
  }
};
```

## Recommended Workflow

1. **Define state variables**: `data`, `loading`, `error` (and for mutations: `submitLoading`, `submitError`, `submitSuccess`).
2. **Write the fetch function** wrapped in `useCallback`.
3. **Write the effect** that calls the fetch on mount.
4. **Create sub-components** for loading, error, and empty states.
5. **Wire up the render** with the four-branch conditional.
6. **Add mutations** (create/update/delete) that call the fetch after success.
7. **Add form state** with validation, loading indicator, and success/error feedback.
8. **Add delete confirmation** with a two-step flow (request → confirm).

## Decision Points

### Client-side search/filter or API-side?

- **Client-side** (recommended for small datasets): Fetch all data once, filter in memory using `Array.filter`. Shivaay uses this for product search.
- **API-side** (for large datasets): Send the search query to the API. Requires re-fetching on every query change.

### Optimistic updates or re-fetch?

- **Re-fetch** (simpler, recommended): After mutation, call `fetchData()` to get the latest server state. Always consistent.
- **Optimistic** (faster UX): Update local state immediately, revert on error. More complex and error-prone.

### Form state: single object or individual fields?

- **Single object** (`{ name, price, description }`): Easier to reset, easier to send to the API.
- **Individual `useState`** calls: Simpler for small forms, harder to manage for 5+ fields.

## Common Mistakes

1. **Not resetting error state before a new fetch.** Stale error messages appear alongside fresh data.
2. **Not handling the empty state.** Users see a blank page instead of a helpful "no items" message.
3. **Missing `finally` block.** Loading state stays `true` forever if the fetch throws.
4. **Mutating state directly** (pushing to array instead of spreading).
5. **Not disabling submit button during loading.** Users can trigger duplicate mutations.
6. **Not clearing the form after successful mutation.** Users submit the same data twice.
7. **Rendering all states simultaneously.** Using `&&` without proper exclusion (show error AND data at the same time).

## Security Considerations

- **Never trust client-side validation alone.** Always validate on the server/database side (constraints, RLS policies).
- **Sanitise error messages.** API errors may contain internal details (table names, column names). Display a generic message to users and log the real error.
- **Rate-limit retry buttons.** An automatic retry loop can accidentally DDoS your own API.

## Debugging

| Symptom | Likely Cause |
|---------|-------------|
| Data loads but then disappears | Auth state change causing re-render/unmount; client using authenticated vs. anonymous client |
| Loading spinner never goes away | `setLoading(false)` not in `finally` block, or fetch promise never resolves |
| Error state shows, then data appears | Error state not cleared with `setError(null)` at start of fetch |
| Form submits but list doesn't update | `await fetchData()` missing after mutation |
| Duplicate items appear | Submit button not disabled during loading, user double-clicked |

## Production Considerations

- **Loading skeletons** are better UX than spinners for content-heavy pages.
- **Stale-while-revalidate**: Show cached data while fetching fresh data in the background. Libraries like React Query handle this automatically.
- **Error boundaries**: Wrap data-dependent sections in React error boundaries to prevent entire page crashes.
- **Pagination**: For large datasets, implement cursor-based or offset pagination instead of fetching all records.

## Shivaay Example

Shivaay uses this pattern consistently across both public and admin pages:

**Products page** (`src/pages/Products.jsx`):
- `useState` for `products`, `loading`, `error`, `searchQuery`.
- `useCallback` wraps the Supabase fetch with `.or('is_active.eq.true,is_active.is.null')` filter.
- Dedicated `LoadingState`, `ErrorState`, `EmptyState` sub-components.
- Client-side search filtering with `Array.filter` on name, description, and category.
- Uses `publicSupabase` (no auth session) to avoid products disappearing when a customer logs in — a bug that was fixed in commit `52379b6`.

**AdminProducts** (`src/pages/admin/AdminProducts.jsx`):
- Same three-state fetch pattern.
- Full CRUD: form with `EMPTY_FORM` constant, `handleFormChange`, `handleSubmit` (INSERT or UPDATE based on `editingProduct`), `handleDeleteRequest` → `handleDeleteConfirm` two-step flow.
- Reusable form primitives: `FieldWrapper`, `TextInput`, `TextAreaInput` sub-components.
- Submit feedback: `submitLoading`, `submitError`, `submitSuccess` states with timed auto-close.
- Delete confirmation modal with loading state and error display.
- Image upload integrated into the mutation flow (see Client-Side Image Pipeline skill).

**AdminDashboard** (`src/pages/admin/AdminDashboard.jsx`):
- Fetches aggregate counts from multiple tables (products, customers).
- Uses derived stat cards with icons and navigation quick-actions.

**Profile** (`src/pages/Profile.jsx`):
- Fetches from two tables (`customers` + `customer_addresses`) in a single `loadData` function.
- Handles `PGRST116` (no rows found) as a valid state for addresses, not as an error.
- Separate save functions for profile and address with independent loading/success states.

## Anti-Patterns

- **Fetching in the component body** (outside `useEffect`): Causes fetch on every render.
- **Mixing fetch status into a single string** (`status: 'loading' | 'error' | 'success'`): Harder to type-check, easier to forget states.
- **Global loading overlay**: Blocks the entire UI instead of showing inline loading states where the data will appear.
- **Ignoring the empty state**: Showing an empty table with column headers and no rows, instead of a clear "nothing here yet" message.

## Validation Checklist

- [ ] Every fetch has `loading`, `error`, and `data` state variables
- [ ] Error state is cleared at the start of every fetch
- [ ] `finally` block always sets `loading = false`
- [ ] Loading, error, and empty states are rendered with dedicated UI
- [ ] The four render branches are mutually exclusive
- [ ] Retry button calls the same fetch function
- [ ] After mutations, the list is re-fetched
- [ ] Submit button is disabled during loading
- [ ] Form is cleared after successful mutation
- [ ] Delete has a two-step confirmation flow
- [ ] Error messages are user-friendly (not raw API errors)

## Related Skills

- [React Context State Management](../react-context-state-management/SKILL.md) — For client-side state that doesn't come from the server
- [Authentication & Authorisation Architecture](../../security/authentication-authorization-architecture/SKILL.md) — Auth state affects which API client is used for fetching

## Repository Evidence

- [`src/pages/Products.jsx`](../../src/pages/Products.jsx) — Public data fetching with search, loading, error, empty states
- [`src/pages/admin/AdminProducts.jsx`](../../src/pages/admin/AdminProducts.jsx) — Full CRUD lifecycle with form, image upload, delete confirmation
- [`src/pages/admin/AdminDashboard.jsx`](../../src/pages/admin/AdminDashboard.jsx) — Aggregate data fetching with stat cards
- [`src/pages/Profile.jsx`](../../src/pages/Profile.jsx) — Multi-table fetch with independent save handlers
- [`src/lib/supabase.js`](../../src/lib/supabase.js) — Dual Supabase clients (authenticated + public)

## Limitations

- This pattern does not address caching, deduplication, or background refetching. For complex data requirements, a library like React Query is more appropriate.
- The Shivaay project does not implement loading skeletons — it uses spinner-based loading states exclusively.
- Pagination is not used in the Shivaay project — all products are fetched at once. This approach doesn't scale to thousands of records.
- Error retry is manual (user clicks a button). Automatic retry with exponential backoff was not implemented.
