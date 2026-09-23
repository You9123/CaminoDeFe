import { describe, expect, it } from "vitest";
import { countWords, fixDropCap, modernizeSpelling, normalizeVerse } from "../scripts/normalize";

describe("normalización RV1909", () => {
  it("quita tildes antiguas en palabras sueltas", () => {
    expect(modernizeSpelling("ha dado á su Hijo")).toBe("ha dado a su Hijo");
    expect(modernizeSpelling("Y dijo Dios: Sea la luz: y fué la luz.")).toBe("Y dijo Dios: Sea la luz: y fue la luz.");
    expect(modernizeSpelling("uno ó dos")).toBe("uno o dos");
    expect(modernizeSpelling("Á los que")).toBe("A los que");
  });
  it("no toca palabras que solo contienen esas letras", () => {
    expect(modernizeSpelling("Jehová está aquí")).toBe("Jehová está aquí");
    expect(modernizeSpelling("dióle")).toBe("dióle");
  });
  it("corrige la letra capital de inicio de capítulo", () => {
    expect(fixDropCap("EN el principio")).toBe("En el principio");
    expect(fixDropCap("Salmo de David. JEHOVÁ es mi pastor")).toBe("Salmo de David. Jehová es mi pastor");
    expect(fixDropCap("DE SIETE años era Joas")).toBe("De siete años era Joas");
    expect(fixDropCap("¡OH Jehová")).toBe("¡Oh Jehová");
  });
  it("solo corrige la capital en el versículo 1", () => {
    expect(normalizeVerse("JAH es su nombre", 4)).toBe("JAH es su nombre");
    expect(normalizeVerse("  EN   el principio ", 1)).toBe("En el principio");
  });
  it("cuenta palabras", () => {
    expect(countWords("Jehová es mi pastor; nada me faltará.")).toBe(7);
  });
});
