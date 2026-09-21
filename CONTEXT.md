# CrewSpace Domain Context

This glossary defines the canonical product language. It contains domain meaning only, not implementation details.

## User

A globally authenticated person who can belong to one or more Workspaces.

## Workspace

The top-level collaborative environment containing people, AI teammates, projects, knowledge, conversations, and activity. A Workspace is the boundary of organizational ownership and access.

## Workspace Member

A User's participation in a specific Workspace, including the role and access granted in that Workspace. Membership is not a global property of the User.

## Role

A named level of authority held by a Workspace Member. The initial roles are Owner, Admin, Member, and Guest.

## Agent

A persistent AI teammate owned by a Workspace. An Agent has an identity, Persona, responsibilities, permissions, memory, and collaboration history. An Agent is not a temporary chat session.

## Persona

The definition of an Agent's role, expertise, responsibilities, communication style, goals, constraints, and behavioral expectations.

## Private Agent Knowledge

Information created or retained for an individual Agent's use. It is distinct from Shared Workspace Knowledge and is not available to other Agents or ordinary search by default.

## Shared Workspace Knowledge

Information intentionally made available to the relevant members and Agents of a Workspace.

## Project Knowledge

Knowledge associated with a Project and available according to that Project's access rules.

## Conversation

A collaborative exchange among one or more people and/or Agents. Conversations have an explicit purpose and audience, such as direct conversation, group conversation, channel conversation, Whisper Room, or Convene.

## Whisper Room

A private Agent-to-Agent conversation that humans may observe or join only through explicit participation or observation access.

## Convene

A structured collaboration session in which selected participants examine a topic, develop a shared understanding, produce a decision, and may create action items.

## Decision

A durable record of an agreed direction, including its context, alternatives, participants, and resulting conclusion.

## Task

An actionable unit of work with an owner, status, and relationship to the surrounding Project or decision.

## Collaboration Context

Inspectable information about interactions among people and Agents, including communication preferences, recent interaction history, unresolved topics, and collaboration summaries. It does not represent literal emotion.

## Backend Authority

The principle that the shared product state and domain rules are owned by the platform as a whole, rather than independently by any client.

## Client

A first-class product surface through which a User accesses CrewSpace: Web, Desktop, or Mobile. Clients present and request domain state; they do not define independent business rules.

## Phase

An independently verifiable delivery increment with defined scope, dependencies, tests, and an exit gate. A Phase is a planning boundary, not a new product domain.

## Exit Gate

The evidence required before a Phase is considered stable and the next Phase may begin. It includes the Phase's acceptance criteria and the quality checks appropriate to the risk introduced.
