import { Slack } from "../src/slack/types/index.d";
import * as fs from 'fs';
type Commands = Slack.SlashCommand.Commands;

const properites = {
    getProperty: jest.fn(function () {
        return 'dummy';
    }),
    deleteAllProperties: jest.fn(),
    deleteProperty: jest.fn(),
    getKeys: jest.fn(),
    getProperties: jest.fn(),
    setProperties: jest.fn(),
    setProperty: jest.fn()
};

PropertiesService['getScriptProperties'] = jest.fn(() => properites)
PropertiesService['getUserProperties'] = jest.fn(() => properites)

const mockFetch = jest.fn();
let response: string | Record<string, any>;

UrlFetchApp.fetch = mockFetch;

const responseMock = {
    getResponseCode: jest.fn(() => {
        return 200;
    }),
    getContentText: jest.fn(() => {
        if (typeof response == "string") {
            return response;
        } else {
            return JSON.stringify(response);
        }
    })
};
mockFetch.mockReturnValue(responseMock);

import { executeSlashCommand } from "../src/Code";
describe('Code', () => {
    describe('executeSlashCommand', () => {
        it('/', () => {
            const commands: Commands = {} as Commands;

            commands.text = '';
            commands.user_id = 'U2147483697';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'ephemeral');
            expect(actual).toHaveProperty('text');
        });
        it('tenki|clss20s', () => {
            const commands: Commands = {} as Commands;

            response = fs.readFileSync(__dirname + '/fixtures/area.json').toString();

            commands.text = 'tenki 与那国町';
            commands.user_id = 'U2147483697';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'in_channel');
            expect(actual).toHaveProperty('text');
        });
        it('tenki|clss15s', () => {
            const commands: Commands = {} as Commands;

            response = fs.readFileSync(__dirname + '/fixtures/area.json').toString();

            commands.text = 'tenki 与那国島';
            commands.user_id = 'U2147483697';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'in_channel');
            expect(actual).toHaveProperty('text');
        });
        it('tenki|clss10s', () => {
            const commands: Commands = {} as Commands;

            response = fs.readFileSync(__dirname + '/fixtures/area.json').toString();

            commands.text = 'tenki 与那国島地方';
            commands.user_id = 'U2147483697';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'in_channel');
            expect(actual).toHaveProperty('text');
        });
        it('help', () => {
            const commands: Commands = {} as Commands;

            commands.text = 'help';
            const actual = executeSlashCommand(commands);

            expect(actual).toHaveProperty('response_type', 'ephemeral');
            expect(actual).toHaveProperty('text');
        });
    });
});
