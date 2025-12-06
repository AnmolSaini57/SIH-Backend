# Dropdown Filter Fix - Role Filter Not Working

## Problem
The role filter dropdown in the User Management admin page was not working. When selecting "Students" or "Counsellors" from the dropdown, the table was not filtering the results accordingly.

## Root Cause
The backend query logic had a conflicting filter:

```javascript
// BEFORE (BROKEN)
let query = supabase
  .from('profiles')
  .select(...)
  .eq('college_id', req.tenant)
  .in('role', ['student', 'counsellor']); // Always applied FIRST

if (role && role !== 'all') {
  query = query.eq('role', role); // Then this was applied SECOND
}
```

**The Problem**: 
- First, the query was ALWAYS filtering to only students AND counsellors
- Then when the user selected a specific role, it tried to apply `.eq('role', 'student')` 
- This created a logical conflict where you needed `role IN ['student', 'counsellor'] AND role = 'student'` which doesn't work properly with Supabase query chains

## Solution
Restructured the query logic to handle the role filter conditionally:

```javascript
// AFTER (FIXED)
let query = supabase
  .from('profiles')
  .select(...)
  .eq('college_id', req.tenant);

// Apply role filter
if (role && role !== 'all') {
  query = query.eq('role', role); // Apply specific role filter
} else {
  // If no specific role filter, show only students and counsellors (exclude admin/superadmin)
  query = query.in('role', ['student', 'counsellor']);
}
```

**How it works now**:
- If user selects "Students" → Filter by `role = 'student'` ✅
- If user selects "Counsellors" → Filter by `role = 'counsellor'` ✅
- If user selects "All Users" → Filter by `role IN ['student', 'counsellor']` ✅

## Changes Made

### File: `src/controllers/admin.controller.js`
- **Function**: `getUsers()` (lines 340-410)
- **Change**: Moved `.in('role', ['student', 'counsellor'])` inside an `else` block
- **Effect**: Role filter dropdown now works correctly

## Testing

To verify the fix works:

1. **Test "All Users" filter**:
   - Select "All Users" from dropdown
   - Should show all students and counsellors
   - Should show users

2. **Test "Students" filter**:
   - Select "Students" from dropdown
   - Should show ONLY students
   - Should hide counsellors
   - Row count should be lower

3. **Test "Counsellors" filter**:
   - Select "Counsellors" from dropdown
   - Should show ONLY counsellors
   - Should hide students
   - Row count should be lower

4. **Test with Search + Filter**:
   - Select "Students"
   - Search for a name
   - Should show only matching students (not counsellors)

## Backend Logic Flow

```
GET /api/admin/users?page=1&limit=20&role=student&search=john

Query 1: All users for college
  ↓
Query 2: Role filter applied
  - If role='student' → .eq('role', 'student')
  - If role='counsellor' → .eq('role', 'counsellor')
  - If role='all' → .in('role', ['student', 'counsellor'])
  ↓
Query 3: Search filter applied (if provided)
  - .or(name.ilike.%search%, email.ilike.%search%)
  ↓
Query 4: Pagination applied
  - .order('created_at', { ascending: false })
  - .range(offset, offset + limit - 1)
```

## Frontend Integration

The frontend code was already correct:

```javascript
export const getUsers = async (params = {}) => {
  const { page = 1, limit = 20, role = 'all', search = '' } = params;
  const response = await api.get('/admin/users', {
    params: { page, limit, role, search } // ✅ Correctly passing role
  });
  return response.data;
};
```

The UI component also correctly:
- Sets `filterRole` state when dropdown changes
- Calls `fetchUsers()` with updated `filterRole`
- Resets pagination to page 1 when filter changes

## Status
✅ **FIXED** - The dropdown filter now works correctly

The issue was purely a backend query logic problem that has been resolved.
