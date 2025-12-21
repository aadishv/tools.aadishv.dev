import { ConvexReactClient, ConvexProvider } from "convex/react";
import type { JSX, FunctionComponent } from "react";
import Comments from "./Comments";

const client = new ConvexReactClient(
  import.meta.env.PUBLIC_CONVEX_URL as string,
);

export default function ConvexComments({ slug }: { slug: string }) {
  return (
    <ConvexProvider client={client}>
      <Comments {...{ slug }} />
    </ConvexProvider>
  );
}
