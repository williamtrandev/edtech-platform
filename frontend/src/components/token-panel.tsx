import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const ACCESS_TOKEN_KEY = "access_token";

export function TokenPanel() {
  const [value, setValue] = useState("");
  const existingToken = useMemo(() => localStorage.getItem(ACCESS_TOKEN_KEY), []);

  const handleSaveToken = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, trimmed);
    window.location.reload();
  };

  const handleClearToken = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.location.reload();
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Auth Token</CardTitle>
        <CardDescription>Backend APIs are protected. Save Supabase JWT token to `localStorage.access_token`.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={existingToken ? "default" : "outline"}>{existingToken ? "Token loaded" : "No token"}</Badge>
        </div>
        <Input
          placeholder="Paste Bearer token value"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="flex gap-2">
          <Button type="button" onClick={handleSaveToken} disabled={!value.trim()}>
            Save token
          </Button>
          <Button type="button" variant="outline" onClick={handleClearToken}>
            Clear token
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
