import { existsSync } from 'fs';
import { resolve } from 'path';
import { Command } from 'commander';
import { DiscordAPI } from '../utils/api.js';
import { requireToken, requireServer } from '../utils/config.js';
import { printResult, resolveFormat } from '../utils/output.js';

export function registerEmoji(program: Command): void {
  const emoji = program
    .command('emoji')
    .description('Manage server emojis');

  emoji
    .command('list')
    .description('List all custom emojis')
    .option('-n <count>', 'Limit number shown', parseInt)
    .action(async (opts) => {
      const fmt = resolveFormat(program.opts().format);
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const emojis = await api.listEmojis(guildId);

      const limited = emojis.slice(0, opts.n ?? emojis.length);

      if (fmt !== 'table') {
        printResult(limited, fmt);
        return;
      }

      console.log(`\n${limited.length} custom emoji(s)`);
      console.log('─'.repeat(30));
      for (const e of limited) {
        const animated = e.animated ? ' (animated)' : '';
        console.log(`  :${e.name}: — ${e.id}${animated}`);
      }
      console.log();
    });

  emoji
    .command('upload')
    .description('Upload a custom emoji')
    .argument('<name>', 'Emoji name (alphanumeric and underscores)')
    .argument('<file>', 'Image file path (png, jpg, gif, max 256KB)')
    .action(async (name: string, file: string) => {
      const fmt = resolveFormat(program.opts().format);
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);

      const filePath = resolve(file);
      if (!existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      const e = await api.createEmoji(guildId, name, filePath);
      if (fmt !== 'table') {
        printResult(e, fmt);
      } else {
        console.log(`Uploaded emoji :${e.name}: (${e.id})`);
      }
    });

  emoji
    .command('delete')
    .description('Delete a custom emoji')
    .argument('<name>', 'Emoji name or ID')
    .option('--confirm', 'Required to actually delete')
    .action(async (name: string, opts) => {
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const emojis = await api.listEmojis(guildId);

      const emoji = emojis.find(
        (e) => e.name.toLowerCase() === name.toLowerCase() || e.id === name
      );
      if (!emoji) {
        console.error(`Emoji "${name}" not found.`);
        process.exit(3);
      }

      if (!opts.confirm) {
        console.error(`This will delete :${emoji.name}: (${emoji.id}). Add --confirm to proceed.`);
        process.exit(2);
      }

      await api.deleteEmoji(guildId, emoji.id);
      console.log(`Deleted emoji :${emoji.name}:`);
    });
}
