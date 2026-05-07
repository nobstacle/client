import { SocketContextProvider } from "../../context/SocketContextProvider";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-[100dvh] w-[100dvw] items-stretch justify-stretch overflow-hidden bg-white">
      <SocketContextProvider>{children}</SocketContextProvider>
    </main>
  );
}

export default Layout;
