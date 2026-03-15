import { DiscordAPI, CHANNEL_TYPE_NAME } from './api.js';
import type { Channel, Role, Member } from './api.js';

export async function resolveChannel(
  api: DiscordAPI,
  guildId: string,
  name: string
): Promise<Channel> {
  const channels = await api.listChannels(guildId);

  // Try ID match
  const byId = channels.find((c) => c.id === name);
  if (byId) return byId;

  // Strip # prefix
  const clean = name.replace(/^#/, '');

  const matches = channels.filter((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const names = matches.map((m) => `#${m.name} (${CHANNEL_TYPE_NAME[m.type] ?? '?'})`).join(', ');
    console.error(`Ambiguous channel "${clean}". Matches: ${names}`);
    process.exit(1);
  }

  console.error(`Channel "${name}" not found.`);
  process.exit(3);
}

export async function resolveCategory(
  api: DiscordAPI,
  guildId: string,
  name: string
): Promise<Channel> {
  const channels = await api.listChannels(guildId);

  const byId = channels.find((c) => c.id === name && c.type === 4);
  if (byId) return byId;

  const matches = channels.filter(
    (c) => c.type === 4 && c.name.toLowerCase() === name.toLowerCase()
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    console.error(`Ambiguous category "${name}".`);
    process.exit(1);
  }

  console.error(`Category "${name}" not found.`);
  process.exit(3);
}

export async function resolveRole(
  api: DiscordAPI,
  guildId: string,
  name: string
): Promise<Role> {
  const roles = await api.listRoles(guildId);

  const byId = roles.find((r) => r.id === name);
  if (byId) return byId;

  const clean = name.replace(/^@/, '');
  const matches = roles.filter((r) => r.name.toLowerCase() === clean.toLowerCase());
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const names = matches.map((m) => `@${m.name}`).join(', ');
    console.error(`Ambiguous role "${clean}". Matches: ${names}`);
    process.exit(1);
  }

  console.error(`Role "${name}" not found.`);
  process.exit(3);
}

export async function resolveMember(
  api: DiscordAPI,
  guildId: string,
  name: string
): Promise<Member> {
  // Try as ID
  if (/^\d+$/.test(name)) {
    try {
      return await api.getMember(guildId, name);
    } catch {
      // fall through to search
    }
  }

  const members = await api.listMembers(guildId, 1000);
  const clean = name.replace(/^@/, '').toLowerCase();

  const matches = members.filter((m) => {
    const username = m.user?.username?.toLowerCase() ?? '';
    const globalName = m.user?.global_name?.toLowerCase() ?? '';
    const nick = m.nick?.toLowerCase() ?? '';
    return username === clean || globalName === clean || nick === clean;
  });

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const names = matches.map((m) => m.user?.username).join(', ');
    console.error(`Ambiguous user "${name}". Matches: ${names}`);
    process.exit(1);
  }

  console.error(`Member "${name}" not found.`);
  process.exit(3);
}
