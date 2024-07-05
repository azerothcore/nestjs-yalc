function findDevDependencies(packageLockPath) {
  console.log('Check devDeps in packageLockPath', packageLockPath);

  const packageLockJSON = require(packageLockPath);
  // Function to recursively traverse the dependency tree
  // Set to store all devDependencies
  const devDepsSet = new Set();

  // Function to recursively collect devDependencies
  function collectDevDependencies(dependencies) {
   if (!dependencies) {
      return;
    }

    Object.keys(dependencies).forEach((depName) => {
      const depInfo = dependencies[depName];
      if (depInfo.dev) {
        devDepsSet.add(depName);
      }
      if (depInfo.dependencies) {
        collectDevDependencies(depInfo.dependencies);
      }
    });
  }

  // Collect all devDependencies
  collectDevDependencies(packageLockJSON.dependencies);

  // Function to recursively check if a devDependency is used as a dependency
  function checkDependencyUsage(dependencies) {
    if (!dependencies) {
      return;
    }

    Object.keys(dependencies).forEach((depName) => {
      const depInfo = dependencies[depName];
      if (depInfo.dev) {
        return;
      }

      // If this dependency is a devDependency, check if it's used as a regular dependency
      if (devDepsSet.has(depName)) {
        devDepsSet.delete(depName);
      }
      if (depInfo.dependencies) {
        checkDependencyUsage(depInfo.dependencies);
      }
    });
  }

  // Check devDependency usage
  checkDependencyUsage(packageLockJSON.dependencies);

  return Array.from(devDepsSet);
}

module.exports = {
  findDevDependencies,
};
