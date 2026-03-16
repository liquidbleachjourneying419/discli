import { Command } from 'commander';
import { DiscordAPI, PERMISSION } from '../utils/api.js';
import { requireToken, requireServer } from '../utils/config.js';
import { printResult, resolveFormat } from '../utils/output.js';
import { resolveRole, resolveMember } from '../utils/resolve.js';

function parsePermissions(perms: string): bigint {
  let bits = 0n;
  for (const p of perms.split(',')) {
    const name = p.trim().toLowerCase();
    const val = PERMISSION[name];
    if (val === undefined) {
      console.error(`Unknown permission: ${name}`);
      console.error(`Available: ${Object.keys(PERMISSION).join(', ')}`);
      process.exit(2);
    }
    bits |= val;
  }
  return bits;
}

export function registerRole(program: Command): void {
  const role = program
    .command('role')
    .description('Manage server roles');

  role
    .command('list')
    .description('List all roles')
    .option('-n <count>', 'Limit number of roles shown', parseInt)
    .action(async (opts) => {
      const fmt = resolveFormat(program.opts().format);
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const roles = await api.listRoles(guildId);

      const sorted = roles.sort((a, b) => b.position - a.position).slice(0, opts.n ?? roles.length);

      if (fmt !== 'table') {
        printResult(sorted, fmt);
        return;
      }

      const rows = sorted.map((r) => ({
        name: r.name,
        id: r.id,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '(none)',
        managed: r.managed ? 'bot' : '',
        position: r.position,
      }));

      console.log('\nRoles');
      console.log('─────');
      printResult(rows, fmt);
    });

  role
    .command('create')
    .description('Create a new role')
    .argument('<name>', 'Role name')
    .option('--color <hex>', 'Color hex (e.g. #ff5733)')
    .option('--permissions <perms>', 'Comma-separated permissions (e.g. send_messages,view_channel)')
    .option('--mentionable', 'Allow anyone to mention this role')
    .option('--hoist', 'Show role separately in member list')
    .option('--dry-run', 'Show what would be created')
    .action(async (name: string, opts) => {
      const fmt = resolveFormat(program.opts().format);
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);

      const data: Record<string, unknown> = { name };
      if (opts.color) {
        data.color = parseInt(opts.color.replace('#', ''), 16);
      }
      if (opts.permissions) {
        data.permissions = parsePermissions(opts.permissions).toString();
      }
      if (opts.mentionable) {
        data.mentionable = true;
      }
      if (opts.hoist) {
        data.hoist = true;
      }

      if (opts.dryRun) {
        printResult({ action: 'create_role', ...data }, fmt);
        return;
      }

      const r = await api.createRole(guildId, data);
      if (fmt !== 'table') {
        printResult(r, fmt);
      } else {
        console.log(`Created role @${r.name} — ${r.id}`);
      }
    });

  role
    .command('edit')
    .description('Edit an existing role')
    .argument('<name>', 'Role name or ID')
    .option('--name <newName>', 'New role name')
    .option('--color <hex>', 'New color hex (e.g. #ff5733)')
    .option('--permissions <perms>', 'Comma-separated permissions')
    .option('--mentionable', 'Allow anyone to mention this role')
    .option('--no-mentionable', 'Disallow mentioning this role')
    .option('--hoist', 'Show role separately in member list')
    .option('--no-hoist', 'Do not show separately')
    .option('--dry-run', 'Show what would be changed')
    .action(async (name: string, opts) => {
      const fmt = resolveFormat(program.opts().format);
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const r = await resolveRole(api, guildId, name);

      const data: Record<string, unknown> = {};
      if (opts.name) data.name = opts.name;
      if (opts.color) data.color = parseInt(opts.color.replace('#', ''), 16);
      if (opts.permissions) data.permissions = parsePermissions(opts.permissions).toString();
      if (opts.mentionable === true) data.mentionable = true;
      if (opts.mentionable === false) data.mentionable = false;
      if (opts.hoist === true) data.hoist = true;
      if (opts.hoist === false) data.hoist = false;

      if (Object.keys(data).length === 0) {
        console.error('Provide at least one option to change (--name, --color, --permissions, --hoist, --mentionable).');
        process.exit(2);
      }

      if (opts.dryRun) {
        printResult({ action: 'edit_role', role: r.name, changes: data }, fmt);
        return;
      }

      const updated = await api.modifyRole(guildId, r.id, data);
      if (fmt !== 'table') {
        printResult(updated, fmt);
      } else {
        console.log(`Updated role @${updated.name} (${updated.id})`);
      }
    });

  role
    .command('delete')
    .description('Delete a role')
    .argument('<name>', 'Role name or ID')
    .option('--confirm', 'Required to actually delete')
    .action(async (name: string, opts) => {
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const r = await resolveRole(api, guildId, name);

      if (!opts.confirm) {
        console.error(`This will delete @${r.name} (${r.id}). Add --confirm to proceed.`);
        process.exit(2);
      }

      await api.deleteRole(guildId, r.id);
      console.log(`Deleted role @${r.name}`);
    });

  role
    .command('assign')
    .description('Assign a role to a member')
    .argument('<role>', 'Role name or ID')
    .argument('<user>', 'Username or ID')
    .action(async (roleName: string, userName: string) => {
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const r = await resolveRole(api, guildId, roleName);
      const m = await resolveMember(api, guildId, userName);

      await api.addRoleToMember(guildId, m.user!.id, r.id);
      console.log(`Assigned @${r.name} to ${m.user!.username}`);
    });

  role
    .command('remove')
    .description('Remove a role from a member')
    .argument('<role>', 'Role name or ID')
    .argument('<user>', 'Username or ID')
    .action(async (roleName: string, userName: string) => {
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const r = await resolveRole(api, guildId, roleName);
      const m = await resolveMember(api, guildId, userName);

      await api.removeRoleFromMember(guildId, m.user!.id, r.id);
      console.log(`Removed @${r.name} from ${m.user!.username}`);
    });
}
