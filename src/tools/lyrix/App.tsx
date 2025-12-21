import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LyrixTool from "./components/LyrixTool";

// Create a QueryClient instance
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LyrixTool />
    </QueryClientProvider>
  );
}

export default App;
