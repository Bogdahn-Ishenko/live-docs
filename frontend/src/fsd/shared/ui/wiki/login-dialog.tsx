"use client";

import { useState } from "react";
import { useWikiAuth } from "@/fsd/shared/hooks/wiki/use-wiki-auth";
import { Button } from "@/fsd/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import { Input } from "@/fsd/shared/ui/input";
import { Label } from "@/fsd/shared/ui/label";

export function WikiLoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { login } = useWikiAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const err = await login(username, password);
    setIsSubmitting(false);
    if (err) {
      setError(err);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Вход в WikiLive</DialogTitle>
          <DialogDescription>
            Введите логин и пароль для доступа к редактированию.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wiki-login-username">Логин</Label>
            <Input
              id="wiki-login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="demo_user_2"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiki-login-password">Пароль</Label>
            <Input
              id="wiki-login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !username || !password}
            >
              {isSubmitting ? "Вход..." : "Войти"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
