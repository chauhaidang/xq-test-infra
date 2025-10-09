# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

*Use nodejs-quality-engineer agent by default*

## Instruction for agent
- Before plan any implementation, always refer to [README](./README.md) first to get context
- Read existing [TASKS](.claude/agents/TASKS.md) first to see what have been done and what need to be done next


## Notes
- When running tests in any e2e folder, you need to use docker-compose to spin up all containers before run test.
- This project has 2 components: todo-app (in todo-app directory) is an application used for testing the xq-infra (in src directory)
- For information of cli: read [this](./README.md) for comprehensive usage guide
- For information of todo-app: read [this](./todo-app/README.md)
