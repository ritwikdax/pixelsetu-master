import { InjectDb, InjectDbClient } from "@/modules/common";
import { Injectable } from "@nestjs/common";
import { Db, MongoClient } from "mongodb";
import { COLLECTION_NAME } from "./const";
import { Project } from "./schema";


@Injectable()
export class StudioRepository {
    constructor(@InjectDb() private readonly db: Db, @InjectDbClient() private readonly dbClient: MongoClient) {
    }

    async deleteProjectById(projectId: string) {
        const session = this.dbClient.startSession();
        session.startTransaction();
        try {
            const project = await this.db.collection(COLLECTION_NAME.PROJECT).findOne({ id: projectId });
            if (!project) {
                throw new Error('Project not found');
            }
            await this.db.collection(COLLECTION_NAME.PROJECT).deleteOne({ id: projectId });
            await this.db.collection(COLLECTION_NAME.ALBUM).deleteMany({ projectId: projectId });
            await this.db.collection(COLLECTION_NAME.PAYMENT).deleteMany({ projectId: projectId });
            await session.commitTransaction();
        }
        finally {
            await session.endSession();
        }
    }

    async updateProject(projectId: string, project: Partial<Project>) {
        const session = this.dbClient.startSession();
        const now = new Date();
        session.startTransaction();
        try {
            if (project.name) {
                await this.db.collection(COLLECTION_NAME.PROJECT).updateOne({ id: projectId }, { $set: { ...project, updatedAt: now } });
                await this.db.collection(COLLECTION_NAME.ALBUM).updateMany({ projectId: projectId }, { $set: { projectName: project.name, updatedAt: now } });
                await this.db.collection(COLLECTION_NAME.PAYMENT).updateMany({ projectId: projectId }, { $set: { projectName: project.name, updatedAt: now } });
            } else {
                await this.db.collection(COLLECTION_NAME.PROJECT).updateOne({ id: projectId }, { $set: { ...project, updatedAt: now } });
            }
            await session.commitTransaction();
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
}