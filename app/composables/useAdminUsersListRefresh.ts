/**
 * Increment to ask the Users list page (`/users`) to reload after a detail save.
 */
export function useAdminUsersListRefresh() {
  const bump = useState('admin-users-list-refresh-bump', () => 0)

  function requestUsersListRefresh() {
    bump.value++
  }

  return { bump, requestUsersListRefresh }
}
