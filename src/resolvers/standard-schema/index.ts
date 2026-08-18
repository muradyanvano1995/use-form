/**
 * Standard Schema v1 adapter. This entry does not import React or browser APIs
 * and may be loaded from server code. It does not depend on Zod, Yup, or Valibot.
 */
export { standardSchemaResolver } from '../../hooks/useForm/validation/standardSchemaResolver.ts'
export type {
  StandardSchemaV1,
  StandardSchemaV1Issue,
  StandardSchemaV1Result,
} from '../../hooks/useForm/validation/standardSchemaResolver.ts'
