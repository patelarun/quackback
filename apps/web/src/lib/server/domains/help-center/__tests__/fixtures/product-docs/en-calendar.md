# Calendar

## What is it?

The Calendar is where you see all scheduled work in one place — orders, projects, shifts, absences, and other time entries — laid out by day, week, or month. From here you can create new entries, move things to a different day or employee, check and update their status, and export a printable schedule.

You'll find it under **Calendar** in the main menu.

> **Note:** This page is for admins and owners. Employees see their own schedule on a separate, simpler **Calendar** page in the employee app.

---

## Image

![Calendar overview](images/calendar.png)

1. View and date navigation
2. Filters
3. Rows (employees, groups, services, or customers)
4. Entries (orders, shifts, absences, and more)
5. Add new

---

## How to

### Switch between Day, Week, Month, and Month Overview

Click the view selector and choose **Day**, **Week**, **Month**, or **Month Overview**.

- **Day** — shows one column per employee for a single day, with an hour-by-hour time scale down the side, and a side panel listing that day's **unassigned** orders so you can drag them onto an employee.
- **Week** — shows one row per employee and one column per day of the week. Scroll sideways past the edge of the week to slide straight into the next or previous week, or use the arrows/**Today** button instead. A totals row at the bottom of each day column shows hours and order counts for that day.
- **Month** — shows one row per employee and one column for every day of the month, so you can see a whole month of work per employee at a glance. Each day cell shows a few entries before switching to a **"+N more"** link.
- **Month Overview** — a traditional month grid (weeks as rows, days as columns), the same style as a normal wall calendar. All employees' entries for a day are pooled together in that one square instead of being split into employee rows.

You can still click a day to create a new entry, and drag entries to a different day, in every view — including Month Overview.

> **Note:** Switching to **Month Overview** always shows entries by employee and hides the **Group by** option — grouping by group, service, or customer only applies to Day, Week, and Month.

### Group rows by employee, group, service, or customer

1. Use **Group by** to choose what each row represents: **Employee**, **Group**, **Service**, or **Customer**.
2. When grouped, employees are nested under a section header (their user group, the service, or the customer they worked for), and each section shows its own subtotal of hours/orders.
3. Use the sort option next to **Group by** to order rows **A–Z** or **Z–A** by name, or (when grouped by Employee or Group) by total order time, low to high or high to low.

> **Important:** Dragging an entry to a different employee or day only works while **Group by** is set to **Employee**. Switch back to Employee grouping if drag-and-drop stops working.

> **Note:** Switching to **Day** or **Month** view resets **Group by** back to **Employee** — if you had grouped by Service or Customer in Week view, you'll need to choose it again after switching views.

### Change the density (Compact / Spacious)

Use the density option in the toolbar to switch between **Compact** and **Spacious**.

Spacious makes each day column wider in **Week** view, giving entries more room and showing fewer days at once when you scroll. It has no visible effect on the Day view, and only a very small effect on Month view.

### Filter the calendar

1. Click **+ Add filter**.
2. Pick a criterion from the list — for example **Employees**, **Customer**, **Order status**, **Services**, **Tag**, **Area**, **Skills**, or **Date**.
3. Depending on the criterion, either type to search and pick one or more results (for example Employees lets you pick several people), or choose from a fixed list (for example Order status: **Active**, **Completed**, **Cancelled**, or **Freeze**), or pick a start and end date.
4. Click **Apply filter**. The filter appears as a chip above the calendar.
5. Click the **×** on a chip to remove that filter, or click **Clear all** to remove every filter at once (the date range stays, since it can't be removed this way).

> **Note:** Filters, the view you're on, grouping, and density are only remembered while you keep BOS open in that tab — they reset the next time you open the Calendar in a new session.

### Create a new entry

1. Click **+ Add new**, or click an empty spot on the calendar for a specific day and employee.
2. Choose a category: **Order / Shift**, **Time / Presence**, **Absence**, or **Other**.
3. Choose the specific type — for example **Order**, **Project**, or **Shift** under Order/Shift; **Travel Time** or **Overtime** under Time/Presence; **Vacation**, **Parental Leave**, **Sick Leave**, **Child Care (VAB)**, or **Other Absence** under Absence; or **Mileage** or **Expense** under Other.
4. The matching form opens, already filled in with the date (and employee, if you clicked a cell). Complete the rest of the details and save.

> **Note:** A category only appears here if that feature is switched on for your company. If **Absence** or another category is missing, check with whoever manages your company's module settings.

### Open and check an entry's details

Click any entry to open its details. What you see depends on the type:

- **Orders** show the address, phone number, door code and keys (if any), the assigned employees with their scheduled and worked time, budget time, and notes.
- **Absences** show the time or coverage, whether it's approved, and any notes.
- **Other time entries** show the amount or duration, whether it's approved, and any notes.

### Update, approve, or delete an entry from the calendar

Every entry has a **✎ Edit** button and a **⋮ More** button in its details:

- **✎ Edit** opens the full edit form for that entry.
- **⋮ More** opens a menu with more actions, which differ by type:

| Entry type                                                       | Actions in the **⋮ More** menu                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Order / Project                                                  | View order, Email confirmation, SMS confirmation, Copy order, **Delete order** |
| Shift                                                            | Update, Copy, **Delete**                                                       |
| Absence                                                          | View, **Approve**, **Delete**                                                  |
| Other time (overtime, travel time, other time, mileage, expense) | View, **Approve**, **Delete**                                                  |

Orders and shifts also have status buttons at the bottom of their details:

- **Order**: **Cancel** and **Complete** while it's active, or **Activate** to reopen it.
- **Shift**: **Mark as Completed** while it's active, or **Activate** to reopen it.

**Approve** on an absence or other time entry is greyed out once it's already approved. Deleting or cancelling always asks you to confirm first.

> **Important:** Deleting an entry from the calendar can't be undone.

### Approve employee time on an order

On an order with unapproved employee time, click **Approve time** next to the **Employees** list to approve one or more employees' punched or scheduled time in one step.

### Move or copy an entry to a different day or employee

1. Drag the entry to the new day or employee row.
2. Confirm the move when asked.
3. If the entry can also be copied (orders, projects, shifts, absences, and other time entries), or if something already exists at the target, choose **Move** or **Copy** in the dialog that appears.

> **Important:** If the entry has a recorded punch in/out time, moving it removes that punch — you'll see a warning before this happens.

### Assign or unassign employees on an order

- Open the order and click **Add employee** to add someone, or use the menu next to an assigned employee to remove them.
- To do this for several orders at once, turn on **Select mode**, tick the orders, and use **Assign user** or **Unassign user** in the actions bar that appears.

> **Note:** Moving several selected orders at once isn't available yet.

### Export the calendar as a PDF or Excel file

1. Click **Export to PDF**.
2. Choose a **Date range** — a preset of 1, 2, 3, or 10 weeks, or a custom range.
3. Choose **Employees** — all employees, or one specific employee.
4. Choose a **Status** to include — all, active, completed, or cancelled.
5. Choose the **File type** (PDF or Excel) and, for PDF, the **Format** (**Calendar view** or **Table view**).
6. Tick what to **Include in PDF** — service type, customer name, order time, employee name, unassigned orders, address, and/or notes.
7. Click **Export PDF** or **Export Excel**.

> **Note:** Unassigned orders can't be included when you've chosen a single employee.

### Switch between Classic and Beta view

If your company still has access to the older calendar, a **Classic** / **Beta** switch appears in the toolbar.

- **Beta** is the current calendar — the Day/Week/Month/Month Overview views, filters, grouping, and drag-and-drop described above.
- **Classic** is the older calendar. It looks and works differently: rows are still employees, but columns are hours across the day rather than whole days, and it includes some things Beta doesn't have, such as the old **Bookings** entry type and separate punch-time and salary reports. Features described in this guide that are specific to Beta (Day/Week/Month Overview views, Add filter, Group by, density) don't apply in Classic.

**Beta** will eventually replace **Classic** completely, and most companies today only ever see Beta.

---

## What do the fields mean?

### View

**Day**, **Week**, **Month**, or **Month Overview** — how much time is shown at once, and whether entries are split into employee rows (Day/Week/Month) or pooled by day (Month Overview).

### Group by

Whether calendar rows represent **Employee**, **Group**, **Service**, or **Customer**.

### Density

**Compact** or **Spacious** row and column spacing.

### Status colors

Orders and shifts are colored by status: **Active** (blue), **Completed** (green), **Cancelled** (red), and **Frozen** (grey). Absences and other time entries use their own fixed colors regardless of status.

### Weekday and holiday colors

Saturdays, Sundays, and public holidays can be shaded with their own background color across Day, Week, Month, and Month Overview. This is set once for the whole company under **Settings → Company settings → Red Days**, not on the calendar itself.

### Show in calendar

Controls which extra details appear on each entry type directly on the calendar, without opening it — for example an order's address, notes, or punch times. Open it with the eye icon in the toolbar.

### Date range (export)

The period the exported file should cover.

### Format (export)

For a PDF export, whether it looks like the **Calendar view** you see on screen, or a plain **Table view** list.

### Include in PDF

Which details are printed on each order in the export — service type, customer name, order time, employee name, unassigned orders, address, and notes.

---

## Good to know

- Calendar requires the **Calendar** module and the permission to view the schedule page — if you can't see it, check both with whoever manages your company's settings.
- Creating or editing orders and projects, sending confirmation emails or SMS, and approving or deleting entries depend on your own permissions — if an action doesn't do anything, you may not have permission for it.
- Dragging entries between employees or days only works while **Group by** is set to **Employee** — switch it back if drag-and-drop seems to stop working.
- Filters, the selected view, grouping, and density aren't saved permanently — they reset when you start a new session.
- Some older companies still have a **Classic** / **Beta** switch, with Classic offering a few things Beta doesn't (like the old Bookings entry type and separate punch-time/salary reports); most companies only ever see the current **Beta** calendar.
- The calendar always starts the week on Monday, and there's no setting to change this.
- There's no way to sync the calendar with Google Calendar, Outlook, or similar apps — the **Export to PDF** option is the only way to get calendar data out of BOS.
- The old **Bookings** entry type still appears as a **Show in calendar** option for some long-standing companies, labelled as a discontinued feature — new companies won't see it at all.
