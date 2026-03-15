import { Command } from 'commander';
import { DiscordAPI, AUDIT_ACTION, AUDIT_ACTION_NAME } from '../utils/api.js';
import { requireToken, requireServer } from '../utils/config.js';
import { printResult, resolveFormat } from '../utils/output.js';

export function registerAudit(program: Command): void {
  const audit = program
    .command('audit')
    .description('View server audit log');

  audit
    .command('log')
    .description('View recent audit log entries')
    .option('-n <count>', 'Number of entries to fetch', '20')
    .option('--type <action>', 'Filter by action type (e.g. member_kick, channel_create)')
    .option('--user <id>', 'Filter by user who performed the action')
    .action(async (opts) => {
      const fmt = resolveFormat(program.opts().format);
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);

      const queryOpts: { limit?: number; action_type?: number; user_id?: string } = {
        limit: parseInt(opts.n),
      };

      if (opts.type) {
        const actionType = AUDIT_ACTION[opts.type];
        if (actionType === undefined) {
          console.error(`Unknown action type: ${opts.type}`);
          console.error(`Available: ${Object.keys(AUDIT_ACTION).join(', ')}`);
          process.exit(2);
        }
        queryOpts.action_type = actionType;
      }

      if (opts.user) {
        queryOpts.user_id = opts.user;
      }

      const log = await api.getAuditLog(guildId, queryOpts);

      if (fmt !== 'table') {
        printResult(log.audit_log_entries, fmt);
        return;
      }

      const userMap = new Map(log.users.map((u) => [u.id, u.username]));

      console.log('\nAudit Log');
      console.log('─────────');

      if (log.audit_log_entries.length === 0) {
        console.log('  (no entries)');
        return;
      }

      for (const entry of log.audit_log_entries) {
        const who = entry.user_id ? userMap.get(entry.user_id) ?? entry.user_id : '(system)';
        const action = AUDIT_ACTION_NAME[entry.action_type] ?? `unknown(${entry.action_type})`;
        const target = entry.target_id ?? '';
        const reason = entry.reason ? ` — "${entry.reason}"` : '';

        console.log(`  ${who} → ${action} ${target}${reason}`);

        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes.slice(0, 3)) {
            const old = change.old_value !== undefined ? String(change.old_value).slice(0, 30) : '';
            const nw = change.new_value !== undefined ? String(change.new_value).slice(0, 30) : '';
            if (old && nw) {
              console.log(`    ${change.key}: ${old} → ${nw}`);
            } else if (nw) {
              console.log(`    ${change.key}: ${nw}`);
            }
          }
        }
      }
      console.log();
    });

  audit
    .command('types')
    .description('List available audit log action types')
    .action(() => {
      const fmt = resolveFormat(program.opts().format);
      if (fmt !== 'table') {
        const types = Object.entries(AUDIT_ACTION).map(([name, value]) => ({ name, value }));
        printResult(types, fmt);
      } else {
        console.log('\nAudit Log Action Types');
        console.log('─────────────────────');
        for (const [name, value] of Object.entries(AUDIT_ACTION)) {
          console.log(`  ${name.padEnd(25)} ${value}`);
        }
      }
    });
}
