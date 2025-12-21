if [ $# -ne 1 ]; then
  echo "Usage: $0 <name>"
  exit 1
fi

NAME="$1"

ASTRO_PLACEHOLDER="---\n
import Layout from \"@/layouts/Layout.astro\";\n\
import App from \"@/tools/${NAME}.tsx\";\n\
---\n\

<Layout title=\"${NAME}\">\n\
  <App client:only=\"react\" />\n\
</Layout>
"

REACT_PLACEHOLDER="export default function App() {\n\
    return <div>Hello, world!</div>\n\
}"

echo $ASTRO_PLACEHOLDER > "pages/tools/${NAME}.astro"
echo $REACT_PLACEHOLDER > "tools/${NAME}.tsx"
