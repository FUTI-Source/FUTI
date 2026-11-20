module.exports = {
  postcssPlugin: 'remove-invalid-vertical-align',
  OnceExit(root) {
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
