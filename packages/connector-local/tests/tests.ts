import * as path from 'path';
import { Stream } from 'stream';

import * as sinon from 'sinon';
import test from 'ava';
import * as mock from 'mock-require';

import delay from 'hint/dist/src/lib/utils/misc/delay';
import asPathString from 'hint/dist/src/lib/utils/network/as-path-string';
import { getAsUri } from 'hint/dist/src/lib/utils/network/as-uri';

const chokidar = { watch() { } };
const isFile = { default() { } };

mock('hint/dist/src/lib/utils/fs/is-file', isFile);
mock('chokidar', chokidar);

// This needs to be after the mocks to work correctly
import LocalConnector from '../src/connector';

test.beforeEach((t) => {
    t.context.engine = {
        clean() { },
        clear() { },
        emitAsync() { },
        notify() { },
        on() { }
    };
    t.context.isFile = isFile;
});

test.after(() => {
    mock.stopAll();
});

test.serial(`If target is a file, it should emit 'fetch::start::target' event`, async (t) => {
    const fileUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch', 'script.js'));

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(true);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(fileUri);

    t.is(t.context.engine.emitAsync.callCount, 4);
    t.is(t.context.engine.emitAsync.args[0][0], 'scan::start');
    t.is(t.context.engine.emitAsync.args[1][0], 'fetch::start::target');
    t.is(t.context.engine.emitAsync.args[2][0], 'fetch::end::script');

    sandbox.restore();
});

test.serial(`If target is a html file, it should emit 'fetch::end::html' event instead of 'fetch::end'`, async (t) => {
    const fileUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch', 'test.html'));

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(true);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(fileUri);

    t.is(t.context.engine.emitAsync.callCount, 4);
    t.is(t.context.engine.emitAsync.args[0][0], 'scan::start');
    t.is(t.context.engine.emitAsync.args[1][0], 'fetch::start::target');
    t.is(t.context.engine.emitAsync.args[2][0], 'fetch::end::html');

    sandbox.restore();
});

test.serial(`If target is a file (text), 'content' is setted`, async (t) => {
    const fileUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch', 'script.js'));

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(true);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(fileUri);

    const event = t.context.engine.emitAsync.args[2][1];

    t.is(typeof event.response.body.content, 'string');
    t.not(event.response.body.content, '');

    sandbox.restore();
});

test.serial(`If content is passed, it is used instead of the file`, async (t) => {
    const testContent = '"Test Content";';

    const fileUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch', 'script.js'));

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(true);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(fileUri, { content: testContent });

    const event = t.context.engine.emitAsync.args[2][1];

    t.is(typeof event.response.body.content, 'string');
    t.is(event.response.body.content, testContent);

    sandbox.restore();
});

test.serial(`If target is a file (image), 'content' is empty`, async (t) => {
    const fileUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch', 'stylish-output.png'));

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(true);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(fileUri);

    const event = t.context.engine.emitAsync.args[2][1];

    t.is(typeof event.response.body.content, 'string');
    t.is(event.response.body.content, '');

    sandbox.restore();
});

test.serial(`If target is an image, 'content' is empty`, async (t) => {
    const fileUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch', 'stylish-output.png'));

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(true);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(fileUri);

    const event = t.context.engine.emitAsync.args[2][1];

    t.is(typeof event.response.body.content, 'string');
    t.is(event.response.body.content, '');

    sandbox.restore();
});

test.serial(`If target is a directory, shouldn't emit the event 'fetch::start::target'`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch'));

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(directoryUri);

    t.is(t.context.engine.emitAsync.callCount, 5);

    const events: Array<string> = t.context.engine.emitAsync.args.map((arg: Array<any>) => {
        return arg[0];
    }).sort();

    t.is(events[0], 'fetch::end::html');
    t.is(events[1], 'fetch::end::image');
    t.is(events[2], 'fetch::end::script');
    t.is(events[3], 'scan::end');
    t.is(events[4], 'scan::start');

    sandbox.restore();
});

test.serial(`If target is a directory, passed content should be ignored`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'no-watch'));

    const testContent = 'Test Content';

    const sandbox = sinon.createSandbox();

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.spy(t.context.engine, 'emitAsync');

    const connector = new LocalConnector(t.context.engine as any, {});

    await connector.collect(directoryUri, { content: testContent });

    t.is(t.context.engine.emitAsync.callCount, 5);

    const events: Array<Array<any>> = t.context.engine.emitAsync.args.map((args: Array<any>) => {
        return args;
    }).sort();

    t.is(events[0][0], 'fetch::end::html');
    t.not(events[0][1].response.body.content, testContent);
    t.is(events[1][0], 'fetch::end::image');
    t.not(events[1][1].response.body.content, testContent);
    t.is(events[2][0], 'fetch::end::script');
    t.not(events[2][1].response.body.content, testContent);
    t.is(events[3][0], 'scan::end');
    t.is(events[4][0], 'scan::start');

    sandbox.restore();
});

test.serial(`If watch is true, it should watch the right files`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'watch-no-ignore'));
    const directory = asPathString(directoryUri);

    const sandbox = sinon.createSandbox();
    const stream = new Stream();

    (stream as any).close = () => { };

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.stub(process, 'cwd').returns(directory);
    sandbox.spy(t.context.engine, 'emitAsync');
    sandbox.stub(chokidar, 'watch').returns(stream);
    t.context.chokidar = chokidar;

    const connector = new LocalConnector(t.context.engine as any, { watch: true });

    const promise = connector.collect(directoryUri);

    await delay(1000);

    process.emit('SIGINT');

    await promise;

    t.is(t.context.engine.emitAsync.callCount, 2);

    const events: Array<string> = t.context.engine.emitAsync.args.map((arg: Array<any>) => {
        return arg[0];
    }).sort();

    t.is(events[0], 'fetch::end::json');
    t.is(events[1], 'scan::start');

    const args = t.context.chokidar.watch.args[0];

    t.true(t.context.chokidar.watch.calledOnce);
    t.is(args[0], '.');
    t.is(args[1].cwd, directory);
    t.is(args[1].ignored.length, 1);
    t.is(args[1].ignored[0], '.git/');

    sandbox.restore();
});

test.serial(`If watch is true, it should use the .gitignore`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'watch-ignore'));
    const directory = asPathString(directoryUri);

    const sandbox = sinon.createSandbox();
    const stream = new Stream();

    (stream as any).close = () => { };

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.stub(process, 'cwd').returns(directory);
    sandbox.spy(t.context.engine, 'emitAsync');
    sandbox.stub(chokidar, 'watch').returns(stream);
    t.context.chokidar = chokidar;

    const connector = new LocalConnector(t.context.engine as any, { watch: true });

    const promise = connector.collect(directoryUri);

    await delay(500);

    process.emit('SIGINT');

    await promise;

    const args = t.context.chokidar.watch.args[0];

    t.true(t.context.chokidar.watch.calledOnce);
    t.is(args[0], '.');
    t.is(args[1].cwd, directory);
    t.is(args[1].ignored.length, 2);
    t.is(args[1].ignored[0], 'ignore.html');
    t.is(args[1].ignored[1], '.git/');

    sandbox.restore();
});

test.serial(`When the watcher is ready, it should emit the scan::end event`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'watch-no-ignore'));
    const directory = asPathString(directoryUri);

    const sandbox = sinon.createSandbox();
    const stream = new Stream();

    (stream as any).close = () => { };

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.stub(process, 'cwd').returns(directory);
    sandbox.spy(t.context.engine, 'emitAsync');
    sandbox.stub(chokidar, 'watch').returns(stream);
    t.context.chokidar = chokidar;

    const connector = new LocalConnector(t.context.engine as any, { watch: true });

    const promise = connector.collect(directoryUri);

    await delay(500);

    stream.emit('ready');

    process.emit('SIGINT');

    await promise;

    t.is(t.context.engine.emitAsync.callCount, 3);

    const events: Array<string> = t.context.engine.emitAsync.args.map((arg: Array<any>) => {
        return arg[0];
    }).sort();

    t.is(events[0], 'fetch::end::json');
    t.is(events[1], 'scan::end');
    t.is(events[2], 'scan::start');

    sandbox.restore();
});

test.serial(`When the watcher detects a new file, it should emit the fetch::end::{type} and the scan::end events`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'watch-no-ignore'));
    const directory = asPathString(directoryUri);

    const sandbox = sinon.createSandbox();
    const stream = new Stream();

    (stream as any).close = () => { };

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.stub(process, 'cwd').returns(directory);
    sandbox.spy(t.context.engine, 'emitAsync');
    sandbox.stub(chokidar, 'watch').returns(stream);
    t.context.chokidar = chokidar;

    const connector = new LocalConnector(t.context.engine as any, { watch: true });

    const promise = connector.collect(directoryUri);

    await delay(500);

    stream.emit('add', path.join(directory, '..', 'add', 'new-file.html'));

    await delay(500);

    process.emit('SIGINT');

    await promise;

    t.is(t.context.engine.emitAsync.callCount, 4);

    const events: Array<string> = t.context.engine.emitAsync.args.map((arg: Array<any>) => {
        return arg[0];
    }).sort();

    t.is(events[0], 'fetch::end::html');
    t.is(events[1], 'fetch::end::json');
    t.is(events[2], 'scan::end');
    t.is(events[3], 'scan::start');

    sandbox.restore();
});

test.serial(`When the watcher detects a change in a file, it should emit the fetch::end::{type} and the scan::end events`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'watch-no-ignore'));
    const directory = asPathString(directoryUri);

    const sandbox = sinon.createSandbox();
    const stream = new Stream();

    (stream as any).close = () => { };

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.stub(process, 'cwd').returns(directory);
    sandbox.spy(t.context.engine, 'emitAsync');
    sandbox.stub(chokidar, 'watch').returns(stream);
    t.context.chokidar = chokidar;

    const connector = new LocalConnector(t.context.engine as any, { watch: true });

    const promise = connector.collect(directoryUri);

    await delay(500);

    stream.emit('change', path.join(directory, 'tsconfig.json'));

    await delay(500);

    process.emit('SIGINT');

    await promise;

    t.is(t.context.engine.emitAsync.callCount, 4);

    const events: Array<string> = t.context.engine.emitAsync.args.map((arg: Array<any>) => {
        return arg[0];
    }).sort();

    t.is(events[0], 'fetch::end::json');
    t.is(events[1], 'fetch::end::json');
    t.is(events[2], 'scan::end');
    t.is(events[3], 'scan::start');

    sandbox.restore();
});

test.serial(`When the watcher detects that a file was removed, it should emit the scan::end event`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'watch-no-ignore'));
    const directory = asPathString(directoryUri);

    const sandbox = sinon.createSandbox();
    const stream = new Stream();

    (stream as any).close = () => { };

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.stub(process, 'cwd').returns(directory);
    sandbox.spy(t.context.engine, 'emitAsync');
    sandbox.stub(chokidar, 'watch').returns(stream);
    t.context.chokidar = chokidar;

    const connector = new LocalConnector(t.context.engine as any, { watch: true });

    const promise = connector.collect(directoryUri);

    await delay(500);

    stream.emit('unlink', path.join(directory, 'tsconfig.json'));

    await delay(500);

    process.emit('SIGINT');

    await promise;

    t.is(t.context.engine.emitAsync.callCount, 3);

    const events: Array<string> = t.context.engine.emitAsync.args.map((arg: Array<any>) => {
        return arg[0];
    }).sort();

    t.is(events[0], 'fetch::end::json');
    t.is(events[1], 'scan::end');
    t.is(events[2], 'scan::start');

    sandbox.restore();
});

test.serial(`When the watcher get an error, it should throw an error`, async (t) => {
    const directoryUri = getAsUri(path.join(__dirname, 'fixtures', 'watch-no-ignore'));
    const directory = asPathString(directoryUri);

    const sandbox = sinon.createSandbox();
    const stream = new Stream();

    (stream as any).close = () => { };

    sandbox.stub(t.context.isFile, 'default').returns(false);
    sandbox.stub(process, 'cwd').returns(directory);
    sandbox.spy(t.context.engine, 'emitAsync');
    sandbox.stub(chokidar, 'watch').returns(stream);
    t.context.chokidar = chokidar;

    const connector = new LocalConnector(t.context.engine as any, { watch: true });

    const promise = connector.collect(directoryUri);

    await delay(500);

    stream.emit('error', 'Error!');

    t.plan(1);
    try {
        await promise;
    } catch (err) {
        t.is(err, 'Error!');
    }

    sandbox.restore();
});
