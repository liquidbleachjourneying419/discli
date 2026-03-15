---
name: dctl
description: |
  Discord server management CLI. Use when you need to manage Discord servers —
  create channels, assign roles, manage members, rename channels, etc.
  Run dctl --help or dctl <command> --help to discover subcommands.
---

# dctl — Discord Server Management CLI

Control Discord servers from the terminal. Works for both humans and AI agents.

## Quick Reference

```bash
dctl init --token <token>           # First-time setup
dctl server list                    # List servers
dctl server select <id>             # Set default server
dctl server info                    # Server overview

dctl channel list                   # List channels
dctl channel create <name>          # Create channel (--type, --category, --topic)
dctl channel delete <name>          # Delete channel (--confirm required)
dctl channel rename <ch> <name>     # Rename channel
dctl channel topic <ch> <text>      # Set topic

dctl role list                      # List roles
dctl role create <name>             # Create role (--color, --mentionable)
dctl role delete <name>             # Delete role (--confirm required)
dctl role assign <role> <user>      # Give role to member
dctl role remove <role> <user>      # Remove role from member

dctl member list                    # List members
dctl member info <user>             # Member details
dctl member kick <user>             # Kick (--confirm required)
dctl member ban <user>              # Ban (--confirm required)
dctl member nick <user> <nick>      # Change nickname
```

## Global Flags

- `--format json` — machine-readable output (default: table)
- `--server <id>` — target a specific server instead of default
- `--dry-run` — preview changes without applying (on create/rename commands)

## Important Notes

- Destructive commands (delete, kick, ban) require `--confirm` flag
- Channel/role/member names are resolved case-insensitively
- Use `--format json` when parsing output programmatically
- Rate limits: Discord allows ~5 requests/second. Channel renames have a 10-min cooldown per channel.
