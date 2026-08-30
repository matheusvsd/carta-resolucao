type Medida = { chave: string; valor: string };
type Figura = {
  tipo: "triangulo" | "retangulo" | "quadrado" | "trapezio" | "circulo" | "paralelogramo" | "losango";
  medidas: Medida[];
  formula: string;
};

function achar(medidas: Medida[], chave: string) {
  return medidas.find((m) => m.chave === chave)?.valor;
}

const stroke = "#1B2A41";
const fill = "rgba(47,158,143,.12)";
const shapeProps = { stroke, strokeWidth: 2, fill };
const dimStyle = { fontFamily: "'IBM Plex Mono',monospace", fontSize: "11px", fill: "#1B2A41" as const };

function Shape({ tipo, medidas }: { tipo: Figura["tipo"]; medidas: Medida[] }) {
  const base = achar(medidas, "base") ?? achar(medidas, "comprimento") ?? achar(medidas, "lado_maior");
  const altura = achar(medidas, "altura") ?? achar(medidas, "largura");
  const lado = achar(medidas, "lado");
  const raio = achar(medidas, "raio");
  const ladoMaior = achar(medidas, "lado_maior");
  const ladoMenor = achar(medidas, "lado_menor");
  const hipotenusa = achar(medidas, "hipotenusa");

  switch (tipo) {
    case "triangulo":
      return (
        <>
          <polygon points="90,20 20,150 160,150" {...shapeProps} />
          {base && <text x="90" y="168" textAnchor="middle" style={dimStyle}>base: {base}</text>}
          {altura && <text x="30" y="90" textAnchor="middle" style={dimStyle} transform="rotate(-90,30,90)">altura: {altura}</text>}
          {hipotenusa && <text x="125" y="90" textAnchor="middle" style={dimStyle}>hip.: {hipotenusa}</text>}
        </>
      );
    case "retangulo":
      return (
        <>
          <rect x="20" y="45" width="140" height="80" {...shapeProps} />
          {(base ?? "") && <text x="90" y="140" textAnchor="middle" style={dimStyle}>comp.: {base}</text>}
          {altura && <text x="8" y="88" textAnchor="middle" style={dimStyle} transform="rotate(-90,8,88)">larg.: {altura}</text>}
        </>
      );
    case "quadrado":
      return (
        <>
          <rect x="35" y="35" width="100" height="100" {...shapeProps} />
          {lado && <text x="85" y="150" textAnchor="middle" style={dimStyle}>lado: {lado}</text>}
        </>
      );
    case "trapezio":
      return (
        <>
          <polygon points="55,30 125,30 160,150 20,150" {...shapeProps} />
          {ladoMenor && <text x="90" y="20" textAnchor="middle" style={dimStyle}>{ladoMenor}</text>}
          {ladoMaior && <text x="90" y="168" textAnchor="middle" style={dimStyle}>{ladoMaior}</text>}
          {altura && <text x="8" y="90" textAnchor="middle" style={dimStyle} transform="rotate(-90,8,90)">alt.: {altura}</text>}
        </>
      );
    case "circulo":
      return (
        <>
          <circle cx="90" cy="85" r="65" {...shapeProps} />
          {raio && <line x1="90" y1="85" x2="155" y2="85" stroke={stroke} strokeWidth={1.5} />}
          {raio && <text x="120" y="78" textAnchor="middle" style={dimStyle}>r: {raio}</text>}
        </>
      );
    case "paralelogramo":
      return (
        <>
          <polygon points="45,30 170,30 135,150 10,150" {...shapeProps} />
          {base && <text x="90" y="168" textAnchor="middle" style={dimStyle}>base: {base}</text>}
          {altura && <text x="0" y="90" textAnchor="middle" style={dimStyle} transform="rotate(-90,0,90)">alt.: {altura}</text>}
        </>
      );
    case "losango":
      return (
        <>
          <polygon points="90,15 165,85 90,155 15,85" {...shapeProps} />
          {ladoMaior && <text x="130" y="45" textAnchor="middle" style={dimStyle}>D: {ladoMaior}</text>}
          {ladoMenor && <text x="130" y="130" textAnchor="middle" style={dimStyle}>d: {ladoMenor}</text>}
        </>
      );
    default:
      return null;
  }
}

export function QuestionFigure({ figura }: { figura?: Figura | null }) {
  if (!figura) return null;

  return (
    <div className="figure-box">
      <svg viewBox="0 0 180 175" width="180" height="175" className="figure-svg">
        <Shape tipo={figura.tipo} medidas={figura.medidas ?? []} />
      </svg>
      <div className="figure-side">
        {figura.medidas?.length > 0 && (
          <div className="figure-medidas">
            {figura.medidas.map((m, i) => (
              <div key={i} className="figure-medida-item">
                <span className="figure-medida-label">{m.chave.replace("_", " ")}:</span> {m.valor}
              </div>
            ))}
          </div>
        )}
        {figura.formula && (
          <div className="figure-formula">
            <span className="figure-formula-label">Fórmula</span>
            {figura.formula}
          </div>
        )}
      </div>
    </div>
  );
}