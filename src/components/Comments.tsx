import { useEffect, useRef, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { toast, Toaster } from "sonner";
import useTheme from "./theme/useTheme";

interface CommentsProps {
  slug: string;
}

interface CaptchaProps {
  onVerifyToken: (token: string | null) => void;
}

export default function Comments({ slug }: CommentsProps) {
  const [body, setBody] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const comments = useQuery(api.comments.getComments, { slug });
  const addComment = useAction(api.comments.addComment);
  const { isDark } = useTheme();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim() && token) {
      const error = await addComment({ slug, body, token });
      if (error) {
        toast.error(error.error);
      }
      setBody("");
    }
  };

  return (
    <>
      <Toaster richColors />
      <hr />
      <h3>Comments</h3>
      <div className="flex flex-col gap-4">
        {comments?.map((comment) => (
          <div key={comment._id}>
            <p>{comment.body}</p>
            <small className="text-muted-foreground">
              {new Date(comment._creationTime).toLocaleString()}
            </small>
          </div>
        ))}
        <form onSubmit={handleSubmit} className="flex gap-3 h-15 mt-4">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="write a comment!"
            className="!h-[4.75rem]"
          />
          <HCaptcha
            sitekey="8f643442-c6fa-4714-9888-52d4a11e7378"
            size="normal"
            theme={isDark ? "dark" : "light"}
            onVerify={setToken}
          />
          <Button
            type="submit"
            disabled={!body.trim() || !token}
            className="!h-[4.75rem]"
          >
            Submit
          </Button>
        </form>
      </div>
    </>
  );
}
