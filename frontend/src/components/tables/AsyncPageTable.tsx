import { isNull } from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PluginHook, TableOptions, useTable } from "react-table";
import { LoadingIndicator } from "..";
import { usePageSize } from "../../@storage/local";
import { buildOrderListFrom, isNonNullable, ScrollToTop } from "../../utilites";
import BaseTable, { TableStyleProps, useStyleAndOptions } from "./BaseTable";
import PageControl from "./PageControl";
import { useDefaultSettings } from "./plugins";

type Props<T extends object> = TableOptions<T> &
  TableStyleProps<T> & {
    plugins?: PluginHook<T>[];
    aos: AsyncOrderState<T>;
    loader: (start: number, length: number) => void;
  };

export default function AsyncPageTable<T extends object>(props: Props<T>) {
  const { aos, plugins, loader, ...remain } = props;
  const { style, options } = useStyleAndOptions(remain);

  const {
    updating,
    data: { order, items, dirty },
  } = aos;

  const allPlugins: PluginHook<T>[] = [useDefaultSettings];

  if (plugins) {
    allPlugins.push(...plugins);
  }

  // Impl a new pagination system instead of hooking into the existing one
  const [pageIndex, setIndex] = useState(0);
  const [pageSize] = usePageSize();
  const totalRows = order.length;
  const pageCount = Math.ceil(totalRows / pageSize);

  const previous = useCallback(() => {
    setIndex((idx) => idx - 1);
  }, []);

  const next = useCallback(() => {
    setIndex((idx) => idx + 1);
  }, []);

  const goto = useCallback((idx: number) => {
    setIndex(idx);
  }, []);

  const pageStart = pageIndex * pageSize;
  const pageEnd = pageStart + pageSize;

  const visibleItemIds = useMemo(() => order.slice(pageStart, pageEnd), [
    pageStart,
    pageEnd,
    order,
  ]);

  const newData = useMemo(() => buildOrderListFrom(items, visibleItemIds), [
    items,
    visibleItemIds,
  ]);

  const newOptions = useMemo<TableOptions<T>>(
    () => ({
      ...options,
      data: newData,
    }),
    [options, newData]
  );

  const instance = useTable(newOptions, ...allPlugins);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = instance;

  useEffect(() => {
    ScrollToTop();
  }, [pageIndex]);

  useEffect(() => {
    const needFetch = visibleItemIds.length === 0 || dirty === true;
    const needRefresh = !visibleItemIds.every(isNonNullable);
    if (needFetch || needRefresh) {
      loader(pageStart, pageSize);
    }
  }, [visibleItemIds, pageStart, pageSize, loader, dirty]);

  const showLoading = useMemo(
    () =>
      updating && (visibleItemIds.every(isNull) || visibleItemIds.length === 0),
    [visibleItemIds, updating]
  );

  if (showLoading) {
    return <LoadingIndicator></LoadingIndicator>;
  }

  return (
    <React.Fragment>
      <BaseTable
        {...style}
        headers={headerGroups}
        rows={rows}
        prepareRow={prepareRow}
        tableProps={getTableProps()}
        tableBodyProps={getTableBodyProps()}
      ></BaseTable>
      <PageControl
        count={pageCount}
        index={pageIndex}
        size={pageSize}
        total={totalRows}
        canPrevious={pageIndex > 0}
        canNext={pageIndex < pageCount - 1}
        previous={previous}
        next={next}
        goto={goto}
      ></PageControl>
    </React.Fragment>
  );
}
