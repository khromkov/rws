import passPropsThrough from '../passPropsThrough';

describe('passPropsThrough', () => {
  test('src.prop should be 1', () => {
    const src = {};
    const dst = {};

    passPropsThrough(src, dst, 'prop');
    dst.prop = 1;
    expect(src.prop).toBe(1);
  });
});
