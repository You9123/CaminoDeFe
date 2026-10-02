import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { LEGACY_ROUTES, legacyRedirect, PATHS } from "./paths";
import { Layout } from "./Layout";
import { TodayScreen } from "../screens/TodayScreen";
import { BooksScreen } from "../screens/BooksScreen";
import { ChaptersScreen } from "../screens/ChaptersScreen";
import { ReaderScreen } from "../screens/ReaderScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { AchievementsScreen } from "../screens/AchievementsScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { MapScreen } from "../screens/MapScreen";
import { MissionsScreen } from "../screens/MissionsScreen";
import { TimelineScreen } from "../screens/TimelineScreen";
import { CollectiblesScreen } from "../screens/CollectiblesScreen";
import { JournalGate } from "../components/PinLock";
import { NotInTauriScreen } from "../screens/NotInTauriScreen";
import { isTauri } from "../data/db";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";
import { useUpdates } from "../stores/updateStore";
import { useVoices } from "../stores/voicesStore";

export default function App() {
  const refresh = useProgress((s) => s.refresh);
  const checkAchievements = useProgress((s) => s.checkAchievements);
  const loadSettings = useSettings((s) => s.load);

  useEffect(() => {
    // Primero los ajustes (la hora de fin del día afecta a la racha y las misiones).
    // Después se revisan los logros: al actualizar a la V2 se desbloquean los que ya se cumplían.
    if (isTauri())
      void loadSettings()
        .then(refresh)
        .then(checkAchievements)
        // Voces naturales descargadas (Piper, ADR-0011): el modo escuchar las usa si están.
        .then(() => useVoices.getState().refresh())
        // Al final, sin apuro: ¿hay una versión nueva? (ADR-0010)
        .then(() => useUpdates.getState().init())
        .catch((e: unknown) => console.error(e));
  }, [loadSettings, refresh, checkAchievements]);

  if (!isTauri()) return <NotInTauriScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodayScreen />} />
          <Route path="biblia" element={<BooksScreen />} />
          <Route path="biblia/buscar" element={<SearchScreen />} />
          <Route path="biblia/favoritos" element={<FavoritesScreen />} />
          <Route path="biblia/:code" element={<ChaptersScreen />} />
          <Route path="biblia/:code/:chapter" element={<ReaderScreen />} />
          <Route
            path="diario"
            element={
              <JournalGate>
                <JournalScreen />
              </JournalGate>
            }
          />
          {/* Explorar: Libros (mapa) · Historia (línea temporal) · Colección */}
          <Route path={rel(PATHS.books)} element={<MapScreen />} />
          <Route path={rel(PATHS.history)} element={<TimelineScreen />} />
          <Route path={rel(PATHS.collection)} element={<CollectiblesScreen />} />
          {/* Mi camino: Misiones · Logros · Estadísticas */}
          <Route path={rel(PATHS.missions)} element={<MissionsScreen />} />
          <Route path={rel(PATHS.achievements)} element={<AchievementsScreen />} />
          <Route path={rel(PATHS.stats)} element={<StatsScreen />} />
          <Route path="ajustes" element={<SettingsScreen />} />
          {/* Rutas de antes de la V3.5: se redirigen (ADR-0013). */}
          {Object.keys(LEGACY_ROUTES).map((from) => (
            <Route key={from} path={rel(from)} element={<LegacyRedirect />} />
          ))}
          <Route path="*" element={<Navigate to={PATHS.today} replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

/** "/explorar/historia" → "explorar/historia" (las rutas hijas van sin la barra inicial). */
const rel = (path: string) => path.replace(/^\//, "");

/** Lleva una ruta vieja a la nueva, conservando ?etapa=, ?tipo= o ?ficha=. */
function LegacyRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={legacyRedirect(pathname, search) ?? PATHS.today} replace />;
}
