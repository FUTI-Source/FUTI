module.exports = {
  postcssPlugin: 'remove-invalid-css-declarations',
  OnceExit(root) {
    root.walkDecls('-webkit-user-select', (decl) => decl.remove());
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
};
