# How work is filed

Four levels, four tests. Settled 7 September 2026 while restructuring the
portfolio. The poster in this folder is the printable version.

| Level | In the data |
| --- | --- |
| Portfolio | `project_type = 'programme'` and `parent_id is null` |
| Programme | `project_type = 'programme'` with a parent |
| Project | `project_type = 'project'` |
| Operational | `project_type = 'operational'` — a type, not a level |
| Task | a row in `tasks`, always under exactly one project |

## Portfolio

Why the work exists. Stable for a year or more, and the level reported against.

**The test:** would this heading still make sense in twelve months, and would the
sponsor recognise it without explanation?

A portfolio does not go green. It gets re-scoped, or retired. SIS replacement is
the honest exception: it will genuinely finish, and when it does the portfolio
retires rather than completing.

## Programme

A grouping that earns its keep. Projects that must be sequenced or traded off
against each other.

**The test:** do these projects compete for the same time and attention, or would
a shared label do just as well? If a label would do, it is not a programme.

A programme holds almost no work of its own — only genuinely cross-cycle items.

## Project

A deliverable with an end and a next decision.

**The test:** can you name the state in which you would archive it?

If it never ends it is a service line, and belongs in Service operations & fixes.
Timetabling was split on exactly this: the v10 migration ends, the daily imports
and incidents do not.

## Task

One bounded piece of work inside a project. A person, a sitting or two, no
decision of its own.

**The test:** does it need its own next decision and its own children? Then it is
a project.

## Two rules

**More than one at once means it is a label.** If a row can carry several of
something at the same time, it is not a level in the tree. Systems are the case
that proves it — `systems text[]` on the project, surfaced in the Streams view,
rather than a branch above it. Schoolbox work sits in four different portfolios;
the SIS replacement touches Synergetic and Veracross at once.

**One axis per portfolio, declared once.** SIS replacement divides by system.
Data governance by discipline. Reporting and analytics by audience. Different
axes across portfolios are fine. Undeclared axes are what turn filing into an
argument.
