const { promises: fs } = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const { expect } = require('chai');
const tempy = require('tempy');
const del = require('del');

const maker = require('../');
const { validateIcons, svg, png, type } = require('./helpers');

describe('app-icon-maker API', () => {
  let destination;

  afterEach(async () => {
    if (destination) {
      await del(destination, { force: true });
    }

    destination = null;
  });

  it('generates all icons by default usign svg string', async () => {
    destination = tempy.directory();

    await maker(svg, { destination });

    await validateIcons(destination);
  });

  it('generates all icons by default usign svg buffer', async () => {
    destination = tempy.directory();

    await maker(Buffer.from(svg), { destination });

    await validateIcons(destination);
  });

  it('will create the output directory if it does not exisst', async () => {
    destination = tempy.directory();

    const exists = p => fs.access(p).then(() => true).catch(() => false);
    const outdir = path.resolve(destination, 'a/b/c/d');

    expect(await exists(outdir)).to.equal(false);

    await maker(svg, { destination: outdir });

    expect(await exists(outdir)).to.equal(true);
    await validateIcons(outdir);
  });

  for (let exclude of ['icns', 'ico', 'png', 'svg']) {
    it(`can optionally skip ${exclude} output`, async () => {
      destination = tempy.directory();

      await maker(svg, { destination, [exclude]: false });

      await validateIcons(destination, { [exclude]: false });
    });
  }

  it('can optionally generate arbitrary png sizes', async () => {
    destination = tempy.directory();
    const pngSizes = [47, 345, 1000];

    await maker(svg, { destination, icns: false, ico: false, svg: false, pngSizes });

    const actualFiles = await fs.readdir(destination);

    expect(actualFiles.sort()).to.deep.equal([
      '47x47.png',
      '345x345.png',
      '1000x1000.png'
    ].sort());

    for (let size of pngSizes) {
      const buffer = await fs.readFile(path.resolve(destination, `${size}x${size}.png`));
      expect(await type.fromBuffer(buffer)).to.deep.equal({ ext: 'png', mime: 'image/png' });
      const { width, height, depth } = png.read(buffer);

      expect(width).to.equal(size);
      expect(height).to.equal(size);
      expect(depth).to.equal(8);
    }
  });

  it('places all icons in "icons" directory when no options are provided', async () => {
    destination = tempy.directory();

    const cmd = process.execPath;
    const lib = JSON.stringify(require.resolve('../'));
    const script = `require(${lib})('${svg}')`;

    await promisify(execFile)(cmd, ['-e', script], { cwd: destination });

    await validateIcons(path.resolve(destination, 'icons'));
  });
});
