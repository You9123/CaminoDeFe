import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { Layout } from "./Layout";
import { TodayScreen } from "../screens/TodayScreen";
import { BooksScreen } from "../screens/BooksScreen";
import { ChaptersScreen } from "../screens/ChaptersScreen";
import { ReaderScreen } from "../screens/ReaderScreen";
import { NotInTauriScreen } from "../screens/NotInTauriScreen";
import { isTauri } from "../data/db";
import { useProgress } from "../stores/progressStore";

export default function App() {
  const refresh = useProgress((s) => s.refresh);

  useEffect(() => {
    if (isTauri()) void refresh();
  }, [refresh]);

  if (!isTauri()) return <NotInTauriScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodayScreen />} />
          <Route path="biblia" element={<BooksScreen />} />
          <Route path="biblia/:code" element={<ChaptersScreen />} />
          <Route path="biblia/:code/:chapter" element={<ReaderScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
