/**
 * 通用工具类型
 * Shared utility types used across the server layer.
 */

import type { Model } from 'sequelize';

/**
 * 通用 key-value 记录，用于尚未完全类型化的 Sequelize 原始数据对象。
 * TODO: 逐步替换为具体的 Model attribute 接口。
 */
export type PlainRecord = Record<string, any>;

/**
 * Sequelize Model instance type helper.
 * Combines the Model base class (for .update(), .save() etc.) with the attribute interface (for .id, .code etc.)
 * Usage: `const mat = await Material.findOne(...) as MaterialInstance | null;`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModelInstance<A extends {}, C extends {} = Partial<A>> = Model<A, C> & A;
