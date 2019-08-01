import {DataService} from './data.service';
import {Data} from './data.model';
import uuid = require('uuid');
import {dynamodb} from '../test/dynamoMock'

const tableName = 'data';
let dataService: DataService;
let data: Data;

beforeEach(() => {
    data = {name: 'aName', value: 'aValue', updatedAt: 0, createdAt: 0, userId: 'aUserId'};

    dataService = new DataService(tableName, dynamodb);
});

afterEach(async () => {
    await dynamodb.delete({TableName: tableName, Key: {userId: data.userId, name: data.name}}).promise();
});

describe('Data service', () => {
    describe('create method', () => {

        it('should add data in dynamo', async () => {
            const timestamp = new Date().getTime();
            await dataService.create(data);
            let {Item} = await dynamodb.get({TableName: tableName, Key: {userId: data.userId, name: data.name}}).promise();

            expect(Item.name).toEqual(data.name);
            expect(Item.userId).toEqual(data.userId);
            expect(Item.value).toEqual(data.value);
            expect(Item.createdAt).not.toBeLessThan(timestamp);
            expect(Item.updatedAt).not.toBeLessThan(timestamp);
            expect(Item.updatedAt).toEqual(Item.createdAt);
        });
    });
    describe('update method', () => {
        it('should update data in dynamo', async () => {
            const timestamp = new Date().getTime();
            await dynamodb.put({TableName: tableName, Item: data}).promise();
            data.value = 'other value';
            await dataService.update(data);

            const {Item} = await dynamodb.get({TableName: 'data', Key: {userId: data.userId, name: data.name}}).promise();
            expect(Item.name).toEqual(data.name);
            expect(Item.userId).toEqual(data.userId);
            expect(Item.value).toEqual(data.value);
            expect(Item.createdAt).not.toBeLessThan(0);
            expect(Item.updatedAt).not.toBeLessThan(timestamp);
        });
    });
    describe('get method', () => {
        it('should return data from dynamo', async () => {
            await dynamodb.put({TableName: tableName, Item: data}).promise();

            expect(await dataService.get(data.userId, data.name)).toEqual(data)
        });
    });

    describe('list method', () => {
        it('should return all user data from dynamo', async () => {
            await dynamodb.put({TableName: tableName, Item: data}).promise();
            data.name = 'otherName';
            await dynamodb.put({TableName: tableName, Item: data}).promise();

            const dataList = await dataService.list(data.userId);
            expect(dataList).toHaveLength(2);
            expect(dataList[0]).not.toEqual(dataList[1]);
            expect(dataList[1]).toEqual(data);
        });

        it('should not return other users\' data', async () => {
            await dynamodb.put({TableName: tableName, Item: data}).promise();
            data.userId = uuid();
            await dynamodb.put({TableName: tableName, Item: data}).promise();

            const dataList = await dataService.list(data.userId);
            expect(dataList).toHaveLength(1);
        });
    });

    describe('delete method', () => {
        it('should remove data from dynamo', async () => {
            await dynamodb.put({TableName: tableName, Item: data}).promise();

            await dataService.delete(data.userId, data.name);

            expect(await dynamodb.get({TableName: tableName, Key: {userId: data.userId, name: data.name}}).promise()).toEqual({});
        });
    });
});
