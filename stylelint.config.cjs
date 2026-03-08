module.exports = {
    rules: {
        'block-no-empty': true,
        'color-no-invalid-hex': true,
        'declaration-block-no-duplicate-properties': [true, {
            ignore: ['consecutive-duplicates-with-different-values']
        }],
        'font-family-no-duplicate-names': true,
        'no-empty-source': true,
        'no-invalid-double-slash-comments': true,
        'selector-pseudo-class-no-unknown': [true, {
            ignorePseudoClasses: ['global', 'deep']
        }],
        'selector-pseudo-element-no-unknown': [true, {
            ignorePseudoElements: ['v-deep']
        }]
    }
};
