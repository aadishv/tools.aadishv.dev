import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Utility: render HTML with KaTeX support for $$...$$ and $...$ math, and links
function renderWithKatex(element: HTMLElement, raw: string) {
  if (!element) return;
  // Replace <a ...>...</a> with placeholders to avoid KaTeX parsing them
  const linkRegex = /<a [^>]+>.*?<\/a>/g;
  const links: string[] = [];
  let html = raw.replace(linkRegex, (m) => {
    links.push(m);
    return `@@LINK${links.length - 1}@@`;
  });

  // Replace $$...$$ (display math)
  html = html.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math, {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e: any) {
      return `<span class="text-red-500">${e.message}</span>`;
    }
  });

  // Replace $...$ (inline math), but not inside already-rendered display math
  html = html.replace(/\$([^$\n]+)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, {
        displayMode: false,
        throwOnError: false,
      });
    } catch (e: any) {
      return `<span class="text-red-500">${e.message}</span>`;
    }
  });

  // Restore links
  html = html.replace(/@@LINK(\d+)@@/g, (_, i) => links[Number(i)]);

  element.innerHTML = html;
}

type Flashcard = {
  name: string;
  detail: string;
};

const allFlashcardsData: Flashcard[] = [
  // Definitions
  {
    name: "sin⁻¹ or arcsin",
    detail:
      "The inverse of the sine function restricted to $$[-\\pi/2, \\pi/2]$$.",
  },
  {
    name: "cos⁻¹ or arccos",
    detail: "The inverse of the cosine function restricted to $$[0, \\pi]$$.",
  },
  {
    name: "tan⁻¹ or arctan",
    detail:
      "The inverse of the tangent function restricted to $$(-\\pi/2, \\pi/2)$$.",
  },
  // Values
  {
    name: "Asymptotes of csc/cot",
    detail:
      "Vertical asymptotes occur at $$x = n\\pi$$, where n is an integer.",
  },
  {
    name: "Asymptotes of sec/tan",
    detail:
      "Vertical asymptotes occur at $$x = (n+\\frac{1}{2})\\pi$$, where n is an integer.",
  },
  // Translations
  {
    name: "General form (sin/cos)",
    detail: "$$y = a \\sin(b(x-d)) + h$$ or $$y = a \\cos(b(x-d)) + h$$",
  },
  {
    name: "Amplitude",
    detail:
      "The amplitude is $$|a|$$. It's half the distance between the maximum and minimum values.",
  },
  {
    name: "Vertical shift",
    detail:
      "The vertical shift is $$h$$. This is the new midline of the function.",
  },
  {
    name: "Period length (sine/cosine/secant/cosecant)",
    detail: "The period is $$\\frac{2\\pi}{|b|}$$.",
  },
  {
    name: "Period length (tangent/cotangent)",
    detail: "The period is $$\\frac{\\pi}{|b|}$$.",
  },
  {
    name: "Phase shift (horizontal shift)",
    detail: "The phase shift is $$d$$.",
  },
  {
    name: "Transformation of points for $y=a f(b(x-d))+h$",
    detail:
      "A point $(x,y)$ on $f(x)$ transforms to $$(\\frac{x}{b}+d, ay+h)$$. ",
  },
  // Identities
  {
    name: "Pythagorean Identity (Primary)",
    detail: "$$\\sin^2\\theta + \\cos^2\\theta = 1$$",
  },
  {
    name: "Pythagorean Identity (Derived for tan/sec)",
    detail: "$$\\tan^2\\theta + 1 = \\sec^2\\theta$$",
  },
  {
    name: "Pythagorean Identity (Derived for cot/csc)",
    detail: "$$1 + \\cot^2\\theta = \\csc^2\\theta$$",
  },
  {
    name: "cos(A+B) Sum Formula",
    detail: "$$\\cos(A+B) = \\cos A \\cos B - \\sin A \\sin B$$",
  },
  {
    name: "sin(A+B) Sum Formula",
    detail: "$$\\sin(A+B) = \\sin A \\cos B + \\cos A \\sin B$$",
  },
  {
    name: "tan(A+B) Sum Formula",
    detail: "$$\\tan(A+B) = \\frac{\\tan A + \\tan B}{1 - \\tan A \\tan B}$$",
  },
  {
    name: "cos(A-B) Difference Formula",
    detail: "$$\\cos(A-B) = \\cos A \\cos B + \\sin A \\sin B$$",
  },
  {
    name: "sin(A-B) Difference Formula",
    detail: "$$\\sin(A-B) = \\sin A \\cos B - \\cos A \\sin B$$",
  },
  {
    name: "tan(A-B) Difference Formula",
    detail: "$$\\tan(A-B) = \\frac{\\tan A - \\tan B}{1 + \\tan A \\tan B}$$",
  },
  {
    name: "sin(2A) Double-Angle Formula",
    detail: "$$\\sin(2A) = 2 \\sin A \\cos A$$",
  },
  {
    name: "cos(2A) Double-Angle Formula (main)",
    detail: "$$\\cos(2A) = \\cos^2 A - \\sin^2 A$$",
  },
  {
    name: "cos(2A) Double-Angle Formula (in terms of cos)",
    detail: "$$\\cos(2A) = 2 \\cos^2 A - 1$$",
  },
  {
    name: "cos(2A) Double-Angle Formula (in terms of sin)",
    detail: "$$\\cos(2A) = 1 - 2 \\sin^2 A$$",
  },
  {
    name: "tan(2A) Double-Angle Formula",
    detail: "$$\\tan(2A) = \\frac{2 \\tan A}{1 - \\tan^2 A}$$",
  },
  // Law of Sines & Cosines
  {
    name: "Law of Sines",
    detail:
      "In any triangle ABC, $$\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}$$.",
  },
  {
    name: "Area of Triangle (using sine)",
    detail:
      "Area $$= \\frac{1}{2}ab \\sin C = \\frac{1}{2}bc \\sin A = \\frac{1}{2}ac \\sin B$$.",
  },
  {
    name: "Ambiguous Case (Law of Sines)",
    detail:
      "Occurs with SSA (Side-Side-Angle). Zero, one, or two triangles possible. Check height (h = b sin A) against side a. See <a href='https://www.varsitytutors.com/hotmath/hotmath_help/topics/ambiguous-case' target='_blank' rel='noopener noreferrer' class='text-sky-600 hover:text-sky-700 underline font-medium'>details here</a>.",
  },
  {
    name: "Law of Cosines (solve for side)",
    detail: "$$c^2 = a^2 + b^2 - 2ab \\cos C$$",
  },
  {
    name: "Law of Cosines (solve for angle)",
    detail: "$$\\cos C = \\frac{a^2 + b^2 - c^2}{2ab}$$",
  },
  // Vectors
  {
    name: "Vector Representation (component form)",
    detail:
      "A vector from origin to (a,b) is $$\\mathbf{v} = \\langle a, b \\rangle$$.",
  },
  {
    name: "Vector Magnitude",
    detail:
      "Magnitude of $$\\mathbf{v} = \\langle a, b \\rangle$$ is $$||\\mathbf{v}|| = \\sqrt{a^2 + b^2}$$.",
  },
  {
    name: "Vector Direction Angle (θ)",
    detail:
      "For $$\\mathbf{v} = \\langle a, b \\rangle$$, $$\\tan \\theta = \\frac{b}{a}$$. Adjust quadrant based on signs of a and b.",
  },
  {
    name: "Dot Product (Scalar Product)",
    detail:
      "For $$\\mathbf{u} = \\langle u_1, u_2 \\rangle$$ and $$\\mathbf{v} = \\langle v_1, v_2 \\rangle$$, $$\\mathbf{u} \\cdot \\mathbf{v} = u_1 v_1 + u_2 v_2$$.",
  },
  {
    name: "Angle Between Two Vectors (u, v)",
    detail:
      "$$\\cos\\theta = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{||\\mathbf{u}|| \\ ||\\mathbf{v}||}$$",
  },
  // Complex Numbers (Trigonometric Form)
  {
    name: "Trigonometric Form of Complex Number",
    detail:
      "$$z = r(\\cos\\theta + i\\sin\\theta) = r \\text{ cis } \\theta$$, where r is modulus, θ is argument.",
  },
  {
    name: "Product of Complex Numbers (Trig Form)",
    detail:
      "$$z_1 z_2 = r_1 r_2 [\\cos(\\theta_1+\\theta_2) + i\\sin(\\theta_1+\\theta_2)] = r_1 r_2 \\text{ cis}(\\theta_1+\\theta_2)$$.",
  },
  {
    name: "Quotient of Complex Numbers (Trig Form)",
    detail:
      "$$\\frac{z_1}{z_2} = \\frac{r_1}{r_2} [\\cos(\\theta_1-\\theta_2) + i\\sin(\\theta_1-\\theta_2)] = \\frac{r_1}{r_2} \\text{ cis}(\\theta_1-\\theta_2)$$.",
  },
  {
    name: "De Moivre's Theorem",
    detail:
      "For a complex number $$z = r(\\cos\\theta + i\\sin\\theta)$$, $$z^n = r^n(\\cos(n\\theta) + i\\sin(n\\theta)) = r^n \\text{ cis}(n\\theta)$$.",
  },
  {
    name: "nth Roots of a Complex Number",
    detail:
      "The n distinct nth roots of $$z = r(\\cos\\theta + i\\sin\\theta)$$ are $$\\sqrt[n]{r} \\left[ \\cos\\left(\\frac{\\theta + 2k\\pi}{n}\\right) + i\\sin\\left(\\frac{\\theta + 2k\\pi}{n}\\right) \\right]$$ for $$k = 0, 1, 2, \\dots, n-1$$.",
  },
  // Polar Coordinates
  {
    name: "Polar Coordinates Representation",
    detail:
      "A point P is represented by $$(r, \\theta)$$, where r is distance from origin, θ is angle from polar axis.",
  },
  {
    name: "Convert Polar to Rectangular (x)",
    detail: "$$x = r \\cos\\theta$$",
  },
  {
    name: "Convert Polar to Rectangular (y)",
    detail: "$$y = r \\sin\\theta$$",
  },
  {
    name: "Convert Rectangular to Polar (r)",
    detail: "$$r = \\sqrt{x^2+y^2}$$ (modulus)",
  },
  {
    name: "Convert Rectangular to Polar (θ)",
    detail: "$$\\tan\\theta = \\frac{y}{x}$$ (argument, adjust quadrant)",
  },
  // Conic Sections - Parabolas
  {
    name: "Parabola Definition",
    detail:
      "Set of all points in a plane equidistant from a fixed point (focus) and a fixed line (directrix).",
  },
  {
    name: "Parabola Equation (Vertical, vertex at origin)",
    detail: "$$x^2 = 4py$$. Focus: $$(0, p)$$. Directrix: $$y = -p$$.",
  },
  {
    name: "Parabola Equation (Horizontal, vertex at origin)",
    detail: "$$y^2 = 4px$$. Focus: $$(p, 0)$$. Directrix: $$x = -p$$.",
  },
  {
    name: "Parabola Equation (Vertical, vertex (h,k))",
    detail:
      "$$(x-h)^2 = 4p(y-k)$$. Focus: $$(h, k+p)$$. Directrix: $$y = k-p$$.",
  },
  {
    name: "Parabola Equation (Horizontal, vertex (h,k))",
    detail:
      "$$(y-k)^2 = 4p(x-h)$$. Focus: $$(h+p, k)$$. Directrix: $$x = h-p$$.",
  },
  // Conic Sections - Ellipses
  {
    name: "Ellipse Definition",
    detail:
      "Set of all points P in a plane such that the sum of the distances from P to two fixed points (foci) is constant ($$d(P,F_1) + d(P,F_2) = 2a$$).",
  },
  {
    name: "Ellipse Equation (Horizontal major axis, center (h,k))",
    detail:
      "$$\\frac{(x-h)^2}{a^2} + \\frac{(y-k)^2}{b^2} = 1$$, where $$a>b$$.",
  },
  {
    name: "Ellipse Equation (Vertical major axis, center (h,k))",
    detail:
      "$$\\frac{(x-h)^2}{b^2} + \\frac{(y-k)^2}{a^2} = 1$$, where $$a>b$$.",
  },
  {
    name: "Ellipse Foci Relationship",
    detail:
      "$$c^2 = a^2 - b^2$$, where c is distance from center to focus, a is distance from center to vertex on major axis.",
  },
  {
    name: "Ellipse Eccentricity",
    detail:
      "$$e = \\frac{c}{a}$$, where $$0 \\le e < 1$$. Closer to 0 is more circular.",
  },
  // Conic Sections - Hyperbolas
  {
    name: "Hyperbola Definition",
    detail:
      "Set of all points P in a plane such that the absolute difference of the distances from P to two fixed points (foci) is constant ($$|d(P,F_1) - d(P,F_2)| = 2a$$).",
  },
  {
    name: "Hyperbola Equation (Horizontal transverse axis, center (h,k))",
    detail: "$$\\frac{(x-h)^2}{a^2} - \\frac{(y-k)^2}{b^2} = 1$$.",
  },
  {
    name: "Hyperbola Equation (Vertical transverse axis, center (h,k))",
    detail: "$$\\frac{(y-k)^2}{a^2} - \\frac{(x-h)^2}{b^2} = 1$$.",
  },
  {
    name: "Hyperbola Foci Relationship",
    detail: "$$c^2 = a^2 + b^2$$, where c is distance from center to focus.",
  },
  {
    name: "Hyperbola Asymptotes (Horizontal transverse axis)",
    detail: "$$y-k = \\pm \\frac{b}{a}(x-h)$$.",
  },
  {
    name: "Hyperbola Asymptotes (Vertical transverse axis)",
    detail: "$$y-k = \\pm \\frac{a}{b}(x-h)$$.",
  },
  {
    name: "Hyperbola Eccentricity",
    detail: "$$e = \\frac{c}{a}$$, where $$e > 1$$.",
  },
  // Rotation of Axes
  {
    name: "Rotation Formula for x",
    detail: "$$x = x'\\cos\\theta - y'\\sin\\theta$$",
  },
  {
    name: "Rotation Formula for y",
    detail: "$$y = x'\\sin\\theta + y'\\cos\\theta$$",
  },
  {
    name: "Angle of Rotation to Eliminate xy-term",
    detail:
      "For $$Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$$, find θ such that $$\\cot(2\\theta) = \\frac{A-C}{B}$$ (if B≠0).",
  },
];

// Utility: shuffle array in-place
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function App() {
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [originalDeckSize, setOriginalDeckSize] = useState(0);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [completed, setCompleted] = useState(false);

  // For KaTeX typesetting
  const nameRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // On mount, start game
  useEffect(() => {
    function startGame() {
      const newDeck = [...allFlashcardsData];
      shuffleArray(newDeck);
      setDeck(newDeck);
      setOriginalDeckSize(newDeck.length);
      setIsDetailVisible(false);
      setCompleted(false);
    }
    startGame();
  }, []);

  // Render math with KaTeX when card changes or detail visibility changes
  useEffect(() => {
    if (nameRef.current && currentCard) {
      renderWithKatex(nameRef.current, currentCard.name);
    }
    if (isDetailVisible && detailRef.current && currentCard) {
      renderWithKatex(detailRef.current, currentCard.detail);
    } else if (detailRef.current) {
      detailRef.current.innerHTML = "";
    }
  }, [deck, isDetailVisible]);

  // Handlers
  const handleShowAnswer = () => setIsDetailVisible(true);

  const handleCorrect = () => {
    const [, ...rest] = deck;
    if (rest.length === 0) {
      setDeck([]);
      setCompleted(true);
    } else {
      setDeck(rest);
      setIsDetailVisible(false);
    }
  };

  const handleIncorrect = () => {
    if (deck.length === 0) return;
    const [first, ...rest] = deck;
    setDeck([...rest, first]);
    setIsDetailVisible(false);
  };

  const handleRestart = () => {
    const newDeck = [...allFlashcardsData];
    shuffleArray(newDeck);
    setDeck(newDeck);
    setOriginalDeckSize(newDeck.length);
    setIsDetailVisible(false);
    setCompleted(false);
  };

  // Render
  const currentCard = deck[0];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold">OM013 finals prep</h1>
          <p className="mt-2 text-sm sm:text-base">
            Simple UI for studying for precalculus finals
          </p>
        </header>

        {!completed && (
          <div className="mb-4 text-center text-sm font-medium">
            Cards remaining: {deck.length} / {originalDeckSize}
          </div>
        )}

        {!completed && currentCard && (
          <main>
            <Card className="min-h-[300px] sm:min-h-[350px] flex flex-col justify-between">
              <CardContent className="flex-grow flex flex-col justify-center items-center text-center p-6 sm:p-8">
                <div
                  ref={nameRef}
                  className="text-xl sm:text-2xl font-semibold break-words"
                />
                <div
                  ref={detailRef}
                  className={`text-base sm:text-lg mt-4 max-h-[150px] sm:max-h-[200px] overflow-y-auto w-full ${
                    isDetailVisible ? "" : "hidden"
                  }`}
                />
              </CardContent>
            </Card>
            <footer className="mt-6 flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {!isDetailVisible && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleShowAnswer}
                >
                  Show Answer
                </Button>
              )}
              {isDetailVisible && (
                <>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleCorrect}
                  >
                    I Knew It!
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleIncorrect}
                  >
                    Review Again
                  </Button>
                </>
              )}
            </footer>
          </main>
        )}

        {completed && (
          <div className="mt-8 text-center p-6 flex flex-col items-center">
            <h2 className="text-3xl font-semibold">Awesome!</h2>
            <p className="mt-2 text-lg">
              You've reviewed all the trigonometry concepts!
            </p>
            <Button variant="default" className="mt-6" onClick={handleRestart}>
              Study Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
