import { isEmpty, isNotEmpty } from "@/db/utils"
import type { Filter, JoinOperator } from "@/types/table"
import { addDays, endOfDay, startOfDay } from "date-fns"
import {
  and,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  ne,
  notIlike,
  notInArray,
  or,
  type AnyColumn,
  type SQL,
  type Table,
} from "drizzle-orm"

/**
 * Format date into ISO string
 * @param value - The value to be formatted.
 * @returns A string representing the start of the day in ISO format.
 */
function formatDate(value: string | Date): string | undefined {
  const date = new Date(value)
  return isNaN(date.getTime()) ? undefined : startOfDay(date).toISOString()
}

/**
 * Build a date range (startOfDay to endOfDay) in ISO format.
 * @param value - The value to be formatted.
 * @returns An object with start and end ISO date strings or undefined.
 */
function buildDateRange(value: string|string[] | Date): { start: string; end: string } | undefined {
  if (Array.isArray(value)) {
    // Handle the case where value is an array
    // For example, you could return an error or throw an exception
    throw new Error('Invalid input: value cannot be an array');
  }
  const date = new Date(value)
  if (isNaN(date.getTime())) return undefined
  return {
    start: startOfDay(date).toISOString(),
    end: endOfDay(date).toISOString(),
  }
}

/**
 * Construct SQL conditions based on the provided filters for a specific table.
 *
 * This function takes a table and an array of filters, and returns a SQL
 * expression that represents the logical combination of these conditions. The conditions
 * are combined using the specified join operator (either 'AND' or 'OR'), which is determined
 * by the first filter's joinOperator property.
 *
 * Each filter can specify various operators (e.g., equality, inequality,
 * comparison for numbers and dates, etc.) and the function will generate the appropriate
 * SQL expressions based on the filter's type and value.
 *
 * @param table - The table to apply the filters on.
 * @param filters - An array of filters to be applied to the table.
 * @param joinOperator - The join operator to use for combining the filters.
 * @returns A SQL expression representing the combined filters, or undefined if no valid
 * filters are found.
 */
export function filterColumns<T extends Table>({
  table,
  filters,
  joinOperator,
}: {
  table: T
  filters: Filter<T>[]
  joinOperator: JoinOperator
}): SQL | undefined {
  const joinFn = joinOperator === "and" ? and : or

  const conditions = filters.map((filter) => {
    const column = getColumn(table, filter.id)

    switch (filter.operator) {
      case "eq":
        if (Array.isArray(filter.value)) {
          return inArray(column, filter.value)
        } else if (column.dataType === "boolean" && typeof filter.value === "string") {
          return eq(column, filter.value === "true")
        } else if (filter.type === "date") {
          const range = buildDateRange(filter.value)
          return range ? and(gte(column, range.start), lte(column, range.end)) : undefined
        } else {
          return eq(column, filter.value)
        }

      case "ne":
        if (Array.isArray(filter.value)) {
          return notInArray(column, filter.value)
        } else if (column.dataType === "boolean") {
          return ne(column, filter.value === "true")
        } else if (filter.type === "date") {
          const range = buildDateRange(filter.value)
          return range ? or(lt(column, range.start), gt(column, range.end)) : undefined
        } else {
          return ne(column, filter.value)
        }

      case "iLike":
        return filter.type === "text" && typeof filter.value === "string"
          ? ilike(column, `%${filter.value}%`)
          : undefined

      case "notILike":
        return filter.type === "text" && typeof filter.value === "string"
          ? notIlike(column, `%${filter.value}%`)
          : undefined

      case "lt":
        if (filter.type === "number") {
          return lt(column, filter.value)
        } else if (filter.type === "date") {
          const range = buildDateRange(filter.value)
          return range ? lt(column, range.end) : undefined
        }
        return undefined

      case "lte":
        if (filter.type === "number") {
          return lte(column, filter.value)
        } else if (filter.type === "date") {
          const range = buildDateRange(filter.value)
          return range ? lte(column, range.end) : undefined
        }
        return undefined

      case "gt":
        if (filter.type === "number") {
          return gt(column, filter.value)
        } else if (filter.type === "date") {
          const range = buildDateRange(filter.value)
          return range ? gt(column, range.start) : undefined
        }
        return undefined

      case "gte":
        if (filter.type === "number") {
          return gte(column, filter.value)
        } else if (filter.type === "date") {
          const range = buildDateRange(filter.value)
          return range ? gte(column, range.start) : undefined
        }
        return undefined

      case "isBetween":
        if (filter.type === "date" && Array.isArray(filter.value) && filter.value.length === 2) {
          const startRange = buildDateRange(filter.value[0])
          const endRange = buildDateRange(filter.value[1])
          if (startRange && endRange) {
            return and(gte(column, startRange.start), lte(column, endRange.end))
          }
        }
        return undefined

      case "isRelativeToToday":
        if (filter.type === "date" && typeof filter.value === "string") {
          const today = new Date()
          const [amount, unit] = filter.value.split(" ") ?? []
          let startDate: Date
          let endDate: Date

          if (!amount || !unit) return undefined

          switch (unit) {
            case "days":
              startDate = startOfDay(addDays(today, parseInt(amount)))
              endDate = endOfDay(startDate)
              break
            case "weeks":
              startDate = startOfDay(addDays(today, parseInt(amount) * 7))
              endDate = endOfDay(addDays(startDate, 6))
              break
            case "months":
              startDate = startOfDay(addDays(today, parseInt(amount) * 30))
              endDate = endOfDay(addDays(startDate, 29))
              break
            default:
              return undefined
          }

          return and(gte(column, startDate.toISOString()), lte(column, endDate.toISOString()))
        }
        return undefined

      case "isEmpty":
        return isEmpty(column)

      case "isNotEmpty":
        return isNotEmpty(column)

      default:
        throw new Error(`Unsupported operator: ${filter.operator}`)
    }
  })

  const validConditions = conditions.filter((condition) => condition !== undefined)

  return validConditions.length > 0 ? joinFn(...validConditions) : undefined
}

/**
 * Get table column.
 * @param table The table to get the column from.
 * @param columnKey The key of the column to retrieve from the table.
 * @returns The column corresponding to the provided key.
 */
export function getColumn<T extends Table>(
  table: T,
  columnKey: keyof T
): AnyColumn {
  return table[columnKey] as AnyColumn
}
