"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Play, Edit, Trash2, ExternalLink } from "lucide-react";
import { VoiceAgent } from "@/types/agent.types";
import { agentsAPI, liveKitAPI } from "@/lib/api/agents";
import { toast } from "sonner";
import { format } from "date-fns";

const columns: ColumnDef<VoiceAgent>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        {row.original.description && (
          <span className="text-muted-foreground max-w-xs truncate text-sm">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "llmProvider",
    header: "LLM",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-mono text-sm">{row.original.llmProvider}</span>
        <span className="text-muted-foreground text-xs">
          {row.original.llmModel}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "sttProvider",
    header: "STT",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.sttProvider}</span>
    ),
  },
  {
    accessorKey: "ttsProvider",
    header: "TTS",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-mono text-sm">{row.original.ttsProvider}</span>
        <span className="text-muted-foreground text-xs">
          {row.original.ttsVoice}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "targetLatency",
    header: "Target Latency",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.targetLatency}ms</span>
    ),
  },
  {
    accessorKey: "sessionCount",
    header: "Sessions",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.sessionCount || 0}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm">
        {format(new Date(row.original.createdAt), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const agent = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <TestAgentMenuItem agent={agent} />
            <DropdownMenuItem>
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <ViewDetailsMenuItem agent={agent} />
            <DropdownMenuSeparator />
            <DeleteAgentMenuItem agent={agent} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

function TestAgentMenuItem({ agent }: { agent: VoiceAgent }) {
  const router = useRouter();
  const { getToken } = useAuth();

  const handleTest = async () => {
    try {
      toast.loading("Starting test session...", { id: "test-agent" });

      const token = await getToken();
      if (!token) {
        toast.error("Authentication required", { id: "test-agent" });
        return;
      }

      const session = await liveKitAPI.createSession(
        agent.id,
        undefined,
        token
      );

      toast.success("Test session created!", { id: "test-agent" });

      sessionStorage.setItem(
        "livekit:testSession",
        JSON.stringify({
          agentId: agent.id,
          agentName: agent.name,
          livekitAgentName: agent.livekitAgentName,
          sessionId: session.sessionId,
          roomName: session.roomName,
          accessToken: session.accessToken,
          wsUrl: session.wsUrl,
        })
      );

      router.push(`/dashboard/agents/${agent.id}/test`);
    } catch (error) {
      console.error("Failed to start test session:", error);
      toast.error("Failed to start test session", { id: "test-agent" });
    }
  };

  return (
    <DropdownMenuItem onClick={handleTest}>
      <Play className="h-4 w-4" />
      Test Agent
    </DropdownMenuItem>
  );
}

function ViewDetailsMenuItem({ agent }: { agent: VoiceAgent }) {
  const router = useRouter();
  return (
    <DropdownMenuItem
      onClick={() => {
        router.push(`/dashboard/agents/${agent.id}`);
      }}
    >
      <ExternalLink className="h-4 w-4" />
      View Details
    </DropdownMenuItem>
  );
}

function DeleteAgentMenuItem({ agent }: { agent: VoiceAgent }) {
  const { getToken } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;

    try {
      setDeleting(true);

      const token = await getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      await agentsAPI.delete(agent.id, token);

      toast.success("Agent deleted");
      window.dispatchEvent(new Event("agents:refresh"));
    } catch (err) {
      console.error("Failed to delete agent:", err);
      toast.error("Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DropdownMenuItem
      className="text-destructive"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="h-4 w-4" />
      {deleting ? "Deleting..." : "Delete"}
    </DropdownMenuItem>
  );
}

export function AgentsTable() {
  const { getToken } = useAuth();
  const [data, setData] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
    pageCount: 0,
    total: 0,
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: pagination.pageCount,
  });

  const fetchAgents = async () => {
    try {
      setLoading(true);

      const token = await getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const params = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter || undefined,
      };

      const response = await agentsAPI.list(params, token);

      setData(response.data);
      setPagination((prev) => ({
        ...prev,
        pageCount: response.pagination.pages,
        total: response.pagination.total,
      }));
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [pagination.pageIndex, pagination.pageSize, globalFilter]);

  useEffect(() => {
    const onRefresh = () => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      fetchAgents();
    };
    window.addEventListener("agents:refresh", onRefresh);
    return () => window.removeEventListener("agents:refresh", onRefresh);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search agents..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-[320px]"
        />

        <div className="text-muted-foreground text-sm">
          {pagination.total} total agents
        </div>
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <div className="bg-muted h-4 animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No agents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-muted-foreground text-sm">
          Showing{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{" "}
          to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            pagination.total
          )}{" "}
          of {pagination.total} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
