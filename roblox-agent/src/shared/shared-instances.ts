import { ReplicatedStorage, RunService } from '@rbxts/services';

export function getSharedInstance<T extends keyof CreatableInstances>(
  name: string,
  className: T
): Instances[T] {
  const parent = getParent();
  let existingInstance = parent.FindFirstChild(name);
  if (existingInstance) {
    if (!classIs(existingInstance, className)) {
      throw `Existing shared instance "${name}" is not a ${className}`;
    }
    return existingInstance;
  }
  if (RunService.IsClient()) {
    existingInstance = parent.WaitForChild(name);
    if (!classIs(existingInstance, className)) {
      throw `Existing shared instance "${name}" is not a ${className}`;
    }
    return existingInstance;
  }

  const newInstance = new Instance(className);
  newInstance.Name = name;
  newInstance.Parent = parent;
  return newInstance as Instances[T];
}

function getParent(): Instance {
  const name = 'BrokerSharedInstances';
  let parent = ReplicatedStorage.FindFirstChild(name);
  if (!parent) {
    parent = new Instance('Folder');
    parent.Name = name;
    parent.Parent = ReplicatedStorage;
  }
  return parent;
}
