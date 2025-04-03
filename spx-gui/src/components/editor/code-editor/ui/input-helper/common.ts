export enum ValueType {
  Literal = 'literal',
  Identifier = 'identifier',
}

export type LiteralValue<T> = {
  type: ValueType.Literal
  value: T
}

export type IdentifierValue = {
  type: ValueType.Identifier
  name: string
}

export type Value<T = unknown> = LiteralValue<T> | IdentifierValue
