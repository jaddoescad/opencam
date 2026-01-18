# OpenCam Codebase Improvement Plan

This document tracks the improvements being made to the OpenCam codebase.

## Overview

| # | Task | Priority | Status | Files Affected |
|---|------|----------|--------|----------------|
| 1 | Create photo URL utility function | High | Done | `lib/utils.ts`, `photo-grid.tsx` |
| 2 | Fix getInitials duplication | High | Done | `photo-grid.tsx` |
| 3 | Fix N+1 query in photo-grid | High | Done | `hooks/useProjectData.ts`, `photo-grid.tsx` |
| 4 | Create Error Boundary component | High | Done | `components/error-boundary.tsx` |
| 5 | Create custom confirmation dialog | Medium | Done | `components/confirm-dialog.tsx`, `photo-grid.tsx`, `member-list.tsx` |
| 6 | Add useCallback/useMemo optimizations | Medium | Done | Already in place in `photo-grid.tsx` |
| 7 | Create useForm hook | Medium | Done | `hooks/useForm.ts` |
| 8 | Add missing hook tests | Medium | Done | `__tests__/hooks/useForm.test.ts` |
| 9 | Fix act() warnings in tests | Low | Pending | `__tests__/components/*.test.tsx` |
| 10 | Add Zod validation schemas | Low | Pending | New: `lib/schemas.ts` |

---

## Completed Tasks

### 1. Create Photo URL Utility Function
**Status:** Done

**Changes:**
- Added `getPhotoUrl()` function to `src/lib/utils.ts`
- Updated `src/components/photo-grid.tsx` to import and use the utility
- Removed duplicate local implementation

---

### 2. Fix getInitials Duplication
**Status:** Done

**Changes:**
- Removed duplicate `getInitials()` function from `photo-grid.tsx`
- Now imports from `@/lib/utils`

---

### 3. Fix N+1 Query in photo-grid
**Status:** Done

**Changes:**
- Updated `useProjectData.ts` to fetch photos with uploader profiles using Supabase join:
  ```typescript
  .select(`*, uploader:profiles(*)`)
  ```
- Changed `photos` state and return type to `PhotoWithUploader[]`
- Simplified `photo-grid.tsx` by removing separate `fetchUploaderInfo()` function
- Photos now come pre-populated with uploader data from the hook

---

### 4. Create Error Boundary Component
**Status:** Done

**Created:** `src/components/error-boundary.tsx`

**Features:**
- React class component error boundary
- Catches JavaScript errors in child components
- Shows friendly error UI with retry and refresh options
- Displays error message for debugging
- Accepts custom fallback prop

---

### 5. Create Custom Confirmation Dialog
**Status:** Done

**Created:** `src/components/confirm-dialog.tsx`

**Features:**
- Reusable confirmation dialog component
- Three variants: `default`, `warning`, `danger`
- Loading state support
- Click outside and escape key to close
- Customizable labels

**Updated:**
- `photo-grid.tsx` - Uses ConfirmDialog for photo deletion
- `member-list.tsx` - Uses ConfirmDialog for member removal

---

### 6. Add useCallback/useMemo Optimizations
**Status:** Done (Already in place)

The critical navigation callbacks in `photo-grid.tsx` already use `useCallback`:
- `navigateToPrevious`
- `navigateToNext`
- `closeLightbox`

---

### 7. Create useForm Hook
**Status:** Done

**Created:** `src/hooks/useForm.ts`

**Features:**
- Generic form state management
- Field-level and form-level validation
- Touched/dirty state tracking
- Error handling
- Submit handling with loading state
- Reset functionality
- Built-in validators: `required`, `minLength`, `maxLength`, `email`, `pattern`

**Export:** Added to `src/hooks/index.ts`

---

### 8. Add Missing Hook Tests
**Status:** Done

**Created:** `src/__tests__/hooks/useForm.test.ts`

**Coverage:**
- Value initialization and updates
- Dirty state tracking
- Error setting/clearing
- Touched field tracking
- Field and form validation
- Form reset
- Submit handling

Note: Most hooks already had tests (`useProjects`, `useTemplates`, `useKeyboardNavigation`, `useClickOutside`, `useUsers`, `useProjectData`, `useCurrentUser`)

---

## Pending Tasks

### 9. Fix act() Warnings in Tests
**Priority:** Low
**Status:** Pending

**Problem:** Multiple async state update warnings in component tests.

**Solution:** Properly wrap async operations in `act()` or use `waitFor()`.

---

### 10. Add Zod Validation Schemas
**Priority:** Low
**Status:** Pending

**Problem:** No runtime validation for form inputs and API responses.

**Solution:** Create Zod schemas for validation.

---

## Progress Log

| Date | Task | Notes |
|------|------|-------|
| 2026-01-18 | Tasks 1-8 | Completed all high and medium priority improvements |

## Summary of Changes

### New Files Created
- `src/components/error-boundary.tsx` - Error boundary component
- `src/components/confirm-dialog.tsx` - Reusable confirmation dialog
- `src/hooks/useForm.ts` - Form state management hook
- `src/__tests__/hooks/useForm.test.ts` - Tests for useForm hook

### Modified Files
- `src/lib/utils.ts` - Added `getPhotoUrl()` utility
- `src/hooks/index.ts` - Added `useForm` export
- `src/hooks/useProjectData.ts` - Fixed N+1 query, returns `PhotoWithUploader[]`
- `src/components/photo-grid.tsx` - Simplified, uses utilities and ConfirmDialog
- `src/components/member-list.tsx` - Uses ConfirmDialog for confirmations
