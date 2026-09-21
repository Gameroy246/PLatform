# Force Password Reset and Canvas Sharing

## Changes

### 1. Database Schema `systemDb.ts`
- Add a startup migration to add `force_password_change INTEGER DEFAULT 0` to the `users` table if it doesn't exist.

### 2. User Creation API `/api/admin/users/route.ts`
- Modify the `INSERT` statement to set `force_password_change = 1` for newly created users (so Admins/Editors are forced to change their password).

### 3. Login API `/api/auth/login/route.ts` & Password Reset
- If `user.force_password_change === 1`, the login API will return a special flag `requirePasswordChange: true`.
- Update `LoginScreen.tsx` to display a "Change Password" form if this flag is received. It will submit to a new endpoint `/api/auth/force-reset` which will update the password, set `force_password_change = 0`, and log the user in.

### 4. Pipeline Sharing `/api/pipelines/share/route.ts`
- Create a new endpoint `POST /api/pipelines/share` that accepts `pipelineId` and `sharedWith` (an array of user IDs).
- Only the `owner_id` or `SUPERUSER` can call this.

### 5. UI for Sharing in `ProjectDashboard.tsx`
- Add a `Share` button to the pipeline cards for owners/superusers.
- Clicking `Share` opens a modal showing a list of all users in the system (requires fetching from a new or existing user list endpoint).
- The user can toggle which users have access to the canvas, and save.

## User Approval
Please review this plan. This will securely force new users to change their password upon their first login and introduce a robust sharing UI for the Superuser to assign canvases to specific users.
