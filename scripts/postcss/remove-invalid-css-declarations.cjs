module.exports = () => ({
  postcssPlugin: 'remove-invalid-css-declarations',
  OnceExit(root) {
    // 不要在这里删 -webkit-user-select：Turbopack 的 minify 阶段会在 PostCSS 之后
    // 按 browserslist 重新补前缀，删了也删不掉。
    root.walkDecls('vertical-align', (decl) => {
      const rule = decl.parent;
      if (
        rule.type === 'rule' &&
        rule.nodes.some(
          (node) => node.type === 'decl' && node.prop === 'display' && node.value === 'block',
        )
      ) {
        decl.remove();
      }
    });
  },
});

module.exports.postcss = true;
