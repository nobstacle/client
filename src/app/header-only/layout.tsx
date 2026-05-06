import { ReactQueryContextProvider } from "../../context/ReactQueryContextProvider";
import { ShortcutsProvider } from "../dashboard/ShortcutProvider";
import "../globals.css";

export default function HeaderOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ margin: 0, padding: 0, background: 'transparent' }}>
      <ReactQueryContextProvider>
        <ShortcutsProvider>
          {children}
        </ShortcutsProvider>
      </ReactQueryContextProvider>
    </div>
  );
}