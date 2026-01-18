# OpenCam Project Conventions

This document outlines the conventions and patterns used in the OpenCam codebase for AI assistants and developers.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard routes (protected)
│   │   ├── projects/      # Project-related pages
│   │   ├── users/         # User management
│   │   └── templates/     # Template management
│   ├── api/               # API routes
│   └── share/             # Public share pages
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
│   └── supabase/          # Supabase client configuration
├── types/                 # TypeScript type definitions
└── contexts/              # React context providers
```

## Naming Conventions

### Files
- **Components**: PascalCase with kebab-case files (e.g., `photo-grid.tsx` exports `PhotoGrid`)
- **Hooks**: camelCase starting with `use` (e.g., `useCurrentUser.ts`)
- **Types**: PascalCase (e.g., `Project`, `Profile`)
- **Utilities**: camelCase (e.g., `formatRelativeTime`)

### Components
- Use functional components with TypeScript
- Props interfaces should be named `{ComponentName}Props`
- Export named components, not default exports for components

### Hooks
- Prefix with `use` (e.g., `useCurrentUser`, `useProjectData`)
- Return objects with descriptive property names
- Include `loading` and `error` states where applicable

## Data Fetching Patterns

### Use Custom Hooks
Always prefer custom hooks over inline data fetching:

```typescript
// Good - Using custom hook
const { user, role, loading } = useCurrentUser()

// Avoid - Inline fetching
useEffect(() => {
  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser()
    // ...
  }
  fetchUser()
}, [])
```

### Available Hooks

1. **`useCurrentUser`** - Fetches and caches current user with profile
   - Returns: `{ user, profile, role, loading, error }`

2. **`useClickOutside`** - Detects clicks outside a referenced element
   - Signature: `useClickOutside(ref, handler, enabled?)`

3. **`useProjectData`** - Fetches all project data in parallel
   - Returns: `{ project, photos, members, checklists, pages, loading, error, refetch, refetchPhotos, ... }`

4. **`useKeyboardNavigation`** - Handles keyboard events for navigation
   - Signature: `useKeyboardNavigation(handlers, enabled?)`

5. **`useUsers`** - Fetches all users with profile data
   - Returns: `{ users, loading, error, refetch, inviteUser }`
   - Used in: `users/page.tsx`

6. **`useProjects`** - Fetches projects with role-based filtering
   - Options: `{ filter?: FilterType, userId?: string, userRole?: UserRole }`
   - Returns: `{ projects, loading, error, refetch }`
   - Handles Restricted user visibility automatically
   - Used in: `dashboard/page.tsx`

7. **`useTemplates`** - Fetches all template types in parallel
   - Returns: `{ projectTemplates, checklistTemplates, pageTemplates, loading, error, refetch, createTemplate, deleteTemplate }`
   - Used in: `templates/page.tsx`

8. **`usePhotoUpload`** - Handles photo upload logic
   - Signature: `usePhotoUpload(onUploadComplete?)`
   - Returns: `{ uploading, progress, error, uploadFiles, clearError }`
   - Used in: `photo-upload.tsx`

### Supabase Client
- Always use `createClient()` from `@/lib/supabase/client` for client-side operations
- The client handles authentication automatically

## State Management

### Local State
- Use `useState` for component-specific state
- Use custom hooks for reusable state patterns

### User Role Checks
```typescript
// Use the useCurrentUser hook
const { role } = useCurrentUser()
const canEditProject = role === 'Admin' || role === 'Standard'
```

### Roles
- `Admin`: Full access to all features
- `Standard`: Can manage projects, users, templates
- `Restricted`: Can only access assigned projects

## Component Patterns

### Authorization Checks
```typescript
// Redirect restricted users
useEffect(() => {
  if (!userLoading && role === 'Restricted') {
    router.push('/dashboard')
  }
}, [role, userLoading, router])

// Show loading while checking auth
if (userLoading || !authorized) {
  return <LoadingSpinner />
}
```

### Click Outside Handling
```typescript
const menuRef = useRef<HTMLDivElement>(null)
useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)
```

### Modal Components
- Accept `isOpen` and `onClose` props
- Use fixed positioning with z-index 50
- Include backdrop click to close

### Reusable Modal Components

The following modals are available for reuse:

1. **`InviteUserModal`** - Multi-step user invitation flow
   - Props: `{ isOpen, onClose, onInvited }`
   - Location: `src/components/invite-user-modal.tsx`

2. **`CreatePageModal`** - Creates a new project page
   - Props: `{ isOpen, projectId, onClose, onCreated }`
   - Location: `src/components/create-page-modal.tsx`

3. **`CreateChecklistModal`** - Creates a new checklist
   - Props: `{ isOpen, projectId, onClose, onCreated }`
   - Location: `src/components/create-checklist-modal.tsx`

4. **`CreateProjectModal`** - Creates a new project
   - Props: `{ isOpen, onClose }`
   - Location: `src/components/create-project-modal.tsx`

5. **`PhotoUpload`** - Photo upload with drag & drop
   - Props: `{ projectId, onClose, onUploadComplete }`
   - Location: `src/components/photo-upload.tsx`

## TypeScript Conventions

### Type Definitions
All database types are defined in `src/types/database.ts`:
- `Profile`, `Project`, `Photo`, `Checklist`, etc.
- Composite types use intersections: `ProjectMember & { profile: Profile }`

### Composite Types Available
```typescript
// Project with photo data
type ProjectWithPhotos = Project & {
  photo_count?: number
  photos?: Photo[]
}

// Photo with uploader profile
type PhotoWithUploader = Photo & {
  uploader?: Profile
}

// Filter type for project views
type FilterType = 'all' | 'my' | 'archived'
```

### Strict Typing
- Always type function parameters and return values
- Use `null` over `undefined` for optional values
- Prefer interfaces for object shapes

## Testing

### Testing Framework
This project uses **Vitest** with **React Testing Library** for testing. The setup includes:
- `vitest` - Test runner
- `@testing-library/react` - Component testing utilities
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - Browser environment simulation

### Running Tests
```bash
# Run tests in watch mode (interactive development)
npm test

# Run tests once (CI/headless)
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

### Test File Structure
```
src/__tests__/
├── setup.tsx              # Global test setup and mocks
├── utils.test.ts          # Utility function tests
├── components/            # Component tests
│   ├── project-card.test.tsx
│   ├── photo-upload.test.tsx
│   ├── photo-grid.test.tsx
│   ├── checklist.test.tsx
│   ├── member-list.test.tsx
│   ├── create-project-modal.test.tsx
│   └── share-gallery-modal.test.tsx
├── api/                   # API route tests
│   ├── send-invite.test.ts
│   └── auth-callback.test.ts
└── lib/                   # Library/utility tests
    ├── supabase-client.test.ts
    └── supabase-middleware.test.ts
```

### Creating Tests for New Features

**IMPORTANT**: When implementing a new feature, always create corresponding tests:

1. **For new components**: Create `src/__tests__/components/{component-name}.test.tsx`
2. **For new hooks**: Create `src/__tests__/hooks/{hook-name}.test.ts`
3. **For new API routes**: Create `src/__tests__/api/{route-name}.test.ts`
4. **For new utilities**: Add tests to `src/__tests__/utils.test.ts` or create a new file

### Test Patterns

#### Mocking Supabase Client
```typescript
const mockSelect = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table) => {
      if (table === 'your_table') {
        return {
          select: () => ({ eq: mockSelect }),
          insert: mockInsert,
        }
      }
      return {}
    }),
  }),
}))
```

#### Testing Components with Async Data
```typescript
it('should render data after loading', async () => {
  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

#### Testing User Interactions
```typescript
it('should handle button click', async () => {
  const user = userEvent.setup()
  const mockHandler = vi.fn()

  render(<MyComponent onClick={mockHandler} />)

  await user.click(screen.getByRole('button'))
  expect(mockHandler).toHaveBeenCalled()
})
```

#### Creating Mock Data Factories
```typescript
const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: 'project-1',
  name: 'Test Project',
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
})
```

### Before Committing Changes

Always run tests to ensure everything is working:

```bash
# Run the full test suite
npm run test:run

# Check for TypeScript errors
npm run build
```

All tests must pass before committing. If a test fails:
1. Check if your changes broke existing functionality
2. Update tests if the expected behavior has intentionally changed
3. Add new tests for new functionality

### Test Coverage Expectations

When making changes:
1. Test user authentication flows
2. Verify role-based access control works correctly
3. Test data loading states (loading, error, success)
4. Test keyboard navigation where applicable
5. Test error handling and edge cases
6. Aim for meaningful coverage of critical paths

## Security Considerations

### Row Level Security (RLS)
- All data access is controlled by Supabase RLS policies
- Never trust client-side role checks alone for security

### User Input
- Sanitize user input before database operations
- Use parameterized queries (Supabase handles this)

### Protected Routes
- Dashboard routes require authentication
- Check user roles server-side when possible
