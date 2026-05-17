# Data Access Layer

Location: `lib/db/src/` — 14 modules, one per entity.

All functions accept `SupabaseClient` as the first parameter:

- **portfolio** passes the anon-key client from `@workspace/supabase/client`
- **admin** passes the service-role client from `@workspace/supabase/admin`
- **api-server** creates its own service-role client inline

## Module Reference

### `heroContent.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `getHeroContent(supabase)` | `HeroContent \| null` | Get singleton row |
| `upsertHeroContent(supabase, args)` | `string` (id) | Update or insert |
| `seedDefaultHeroContent(supabase)` | `string \| null` | Insert defaults if empty |

### `aboutContent.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `getAboutContent(supabase)` | `AboutContent \| null` | Get singleton |
| `upsertAboutContent(supabase, args)` | `string` (id) | Update or insert |

### `skills.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `listSkills(supabase)` | `Skill[]` | All skills ordered by sort_order |
| `listSkillsByCategory(supabase, category)` | `Skill[]` | Filtered by category |
| `createSkill(supabase, args)` | `string` (id) | Insert |
| `updateSkill(supabase, id, args)` | `void` | Partial update |
| `deleteSkill(supabase, id)` | `void` | Delete by id |

### `projects.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `listProjects(supabase)` | `Project[]` | All ordered by sort_order |
| `listPublishedProjects(supabase)` | `Project[]` | Only `is_published = true` |
| `createProject(supabase, args)` | `string` (id) | Insert |
| `updateProject(supabase, id, args)` | `void` | Partial update |
| `deleteProject(supabase, id)` | `void` | Delete by id |

### `experience.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `listExperience(supabase)` | `Experience[]` | All ordered by sort_order |
| `createExperience(supabase, args)` | `string` (id) | Insert |
| `updateExperience(supabase, id, args)` | `void` | Partial update |
| `deleteExperience(supabase, id)` | `void` | Delete by id |

### `certifications.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `listCertifications(supabase)` | `Certification[]` | All ordered by sort_order |
| `createCertification(supabase, args)` | `string` (id) | Insert |
| `updateCertification(supabase, id, args)` | `void` | Partial update |
| `deleteCertification(supabase, id)` | `void` | Delete by id |

### `messages.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `listMessages(supabase)` | `Message[]` | All ordered by created_at DESC |
| `unreadCount(supabase)` | `number` | Count of unread messages |
| `sendMessage(supabase, args)` | `void` | Insert (public anon key works) |
| `markMessageRead(supabase, id)` | `void` | Set status = 'read' |
| `markAllMessagesRead(supabase)` | `void` | Set all unread → read |
| `deleteMessage(supabase, id)` | `void` | Delete by id |
| `replyToMessage(email, subject, body)` | `string` | Generate mailto: URL |

### `contactInfo.ts`, `themeSettings.ts`, `typographySettings.ts`, `seoSettings.ts`, `siteSettings.ts`
Each follows the same singleton pattern:
| Function | Returns | Description |
|----------|---------|-------------|
| `get*(supabase)` | `* \| null` | Get singleton row |
| `upsert*(supabase, args)` | `string` (id) | Update or insert |

### `sectionSettings.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `listSectionSettings(supabase)` | `SectionSetting[]` | All ordered by sort_order |
| `updateSectionSetting(supabase, id, args)` | `void` | Partial update |
| `reorderSectionSettings(supabase, items)` | `void` | Batch update sort_order |

### `cvSettings.ts`
| Function | Returns | Description |
|----------|---------|-------------|
| `getLatestCvSettings(supabase)` | `CvSettings \| null` | Most recent CV entry |
| `upsertCvSettings(supabase, args)` | `string` (id) | Update or insert |

## Type Safety

All update functions use `Omit<Partial<InsertT>, 'id' | 'created_at'>` to prevent
accidental primary key or timestamp overwrites at compile time.
