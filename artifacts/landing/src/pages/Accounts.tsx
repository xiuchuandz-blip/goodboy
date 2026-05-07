import { useState } from "react";
import { Plus, Trash2, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAccounts, useAddAccount, useRemoveAccount, useSettings, useUpdateSettings,
  type AccountRow,
} from "@/hooks/useAdmin";

function AddAccountDialog({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const add = useAddAccount();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    add.mutate({ url, key, label: label || url }, {
      onSuccess: () => { setUrl(""); setKey(""); setLabel(""); setOpen(false); onDone(); },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> 添加账号
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle>添加上游账号</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-zinc-300">别名（可选）</Label>
            <Input
              placeholder="My Account"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300">上游 URL</Label>
            <Input
              placeholder="https://xxx.replit.dev/api"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300">上游 Key</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "添加中…" : "确认添加"}
            </Button>
          </DialogFooter>
          {add.isError && (
            <p className="text-red-400 text-sm">{(add.error as Error).message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountRow({ account }: { account: AccountRow }) {
  const remove = useRemoveAccount();
  const { data: settings } = useSettings();
  const update = useUpdateSettings();

  const isPinned = settings?.routingStrategy === account.url;

  function togglePin() {
    update.mutate({
      routingStrategy: isPinned ? "round-robin" : account.url,
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{account.label}</span>
          {isPinned && <Badge className="bg-blue-600 text-white text-xs">已固定</Badge>}
        </div>
        <div className="text-xs text-zinc-400 truncate mt-0.5">{account.url}</div>
        <div className="text-xs text-zinc-500 mt-0.5 font-mono">{account.keyHint}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className={`w-8 h-8 ${isPinned ? "text-blue-400 hover:text-blue-300" : "text-zinc-400 hover:text-zinc-200"}`}
          onClick={togglePin}
          title={isPinned ? "取消固定，切换为轮询" : "固定此账号"}
        >
          {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="w-8 h-8 text-zinc-400 hover:text-red-400"
          onClick={() => remove.mutate(account.index)}
          disabled={remove.isPending}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { data: accounts = [], isLoading, refetch } = useAccounts();
  const { data: settings } = useSettings();

  const strategy = settings?.routingStrategy ?? "round-robin";
  const isRoundRobin = strategy === "round-robin";

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">上游账号</CardTitle>
              <CardDescription className="text-zinc-400">
                管理所有上游代理账号（URL + Key），{" "}
                {isRoundRobin
                  ? "当前策略：轮询所有账号"
                  : `当前策略：固定到 ${accounts.find((a) => a.url === strategy)?.label ?? strategy}`}
              </CardDescription>
            </div>
            <AddAccountDialog onDone={() => { void refetch(); }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <p className="text-zinc-400 text-sm text-center py-4">加载中…</p>
          )}
          {!isLoading && accounts.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">
              暂无账号，点击右上角「添加账号」
            </p>
          )}
          {accounts.map((acc) => (
            <AccountRow key={acc.index} account={acc} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
