# Ganttaro

A shared, hosted Gantt chart that people edit by hand and agents edit through tools, both working on the same live Chart.

## Timeline

**Chart**:
One shared project timeline, opened by everyone through the same link. It holds all of a project's Items, Groups, Dependencies and Holidays.
_Avoid_: Page, document, board, Gantt

**Edit Link**:
A Chart's secret address that lets whoever has it view and edit the Chart.
_Avoid_: Share link, URL

**View Link**:
A Chart's separate secret address that only lets whoever has it look at the Chart.
_Avoid_: Read-only link, public link

**Item**:
Anything placed on a Chart: a Task or a Milestone. Each Item has a fixed internal identifier, used by agents and Dependencies, and a display name, which is the only label people see.
_Avoid_: Event, entry, row

**Task**:
An Item that spans a range of Working Days, from a start day to an end day, both included.
_Avoid_: Activity, bar

**Milestone**:
An Item that marks a single Working Day, such as a kickoff or a signed contract.
_Avoid_: Deadline, checkpoint

**Working Day**:
A weekday that is not a Holiday. Durations count only Working Days.
_Avoid_: Business day, calendar day

**Holiday**:
A weekday that a Chart marks as non-working, such as a public holiday or a company closure.
_Avoid_: Day off, closure, blackout

## Structure

**Group**:
An optional colour category, such as an owning team or a kind of work. An Item belongs to at most one Group.
_Avoid_: Category, tag, team

**Owner**:
A person accountable for an Item, recorded as a plain name. An Item can have several Owners, independent of its Group.
_Avoid_: Assignee, user, member

**Tidy**:
A one-off re-sort of a Chart's rows by start date that keeps chains of dependent Items together. Rows otherwise keep the order they were placed in.
_Avoid_: Auto-sort, arrange

## Relationships

**Dependency**:
A one-way relationship stating that an Item cannot start until another Item is finished. It is recorded only on the later Item and never moves dates on its own.
_Avoid_: Link, constraint, blocker

**Conflict**:
A visible warning that an Item starts before the Items it depends on have finished. The dates stay as the author set them until someone changes them.
_Avoid_: Error, violation

## Editing

**Manual Edit**:
A change someone makes by hand in the Chart: dragging, resizing or renaming.
_Avoid_: UI edit, human edit, text edit

**Agent Edit**:
A change to a Chart that an agent decides on and makes, usually because someone asked it to. It comes in two kinds, depending on the route: Agent Edit (MCP) and Agent Edit (Bridge).
_Avoid_: AI edit, text edit, programmatic edit

**Agent Edit (MCP)**:
An Agent Edit made through Ganttaro's MCP server, from any harness, without the Chart being open.
_Avoid_: API edit, remote edit

**Agent Edit (Bridge)**:
An Agent Edit made by an agent operating the open Chart in a browser, through the Agent Bridge or by driving the page itself. It can only do what a person could do by hand in that Chart. Any change in an open Chart that a person did not make by hand counts as one, never as a Manual Edit.
_Avoid_: Browser edit, WebMCP edit

**Agent Bridge**:
The part of an open Chart that lets an agent in the same browser read the whole Chart and act on it directly, without screenshots. It presents the Chart as a single control whose actions name Items.
_Avoid_: WebMCP, site tools

**Revision**:
A recorded change to a Chart, saying what changed, when, and whether it was a Manual Edit or an Agent Edit. Any earlier Revision can be restored.
_Avoid_: Version, snapshot, save
