import * as colors from 'colors';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

export const NAME = 'venn';
export const FULL_NAME = NAME;

export const DESCRIPTION = `Venn CLI ${colors.cyan('v' + pkg.version)}`;
