import { Dependency } from '@/framework/dependency.type';

export interface IStrategy {
    dependencies: Dependency[];
    isDependencyInstalled(dependency: Dependency): Promise<boolean>;
    installDependency(dependency: Dependency): Promise<void>;
}
