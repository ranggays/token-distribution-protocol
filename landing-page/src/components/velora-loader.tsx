"use client";

import { useEffect } from "react";

const MINIMUM_LOADING_TIME = 1500;
const FORCE_COMPLETE_TIME = 6000;

export function VeloraLoader() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.classList.remove("loaded");

    const loadingBar = document.querySelector<HTMLElement>(".loading-bar");
    const loadingContent =
      document.querySelector<HTMLElement>(".loading-screen-content");
    const loadingScreens = Array.from(
      document.querySelectorAll<HTMLElement>(".loading-screen"),
    );
    const headerLine = document.querySelector<HTMLElement>(".header-line");
    const kineticSlider = document.querySelector<HTMLElement>(".rgbKineticSlider");
    const timeouts: number[] = [];
    const cleanups: Array<() => void> = [];
    let loadingProgress = 0;
    let minTimeElapsed = false;
    let finishing = false;
    let completed = false;

    const queueTimeout = (callback: () => void, delay: number) => {
      const timeout = window.setTimeout(callback, delay);
      timeouts.push(timeout);
      return timeout;
    };

    const startScreenAnimations = () => {
      if (completed) return;
      completed = true;

      loadingContent?.classList.add("hide");
      loadingScreens.forEach((screen) => screen.classList.add("loaded"));
      document.body.classList.add("loaded");
      headerLine?.classList.add("loaded");
      kineticSlider?.classList.add("loaded");
    };

    const updateLoadingBar = (progress: number) => {
      loadingProgress = progress;

      if (loadingBar) {
        loadingBar.style.width = `${progress}%`;
      }

      if (progress >= 100 && minTimeElapsed) {
        queueTimeout(startScreenAnimations, 500);
      }
    };

    const finishLoading = () => {
      if (finishing) return;
      finishing = true;

      let currentProgress = Math.max(loadingProgress, 85);
      const interval = window.setInterval(() => {
        currentProgress = Math.min(currentProgress + 5, 100);
        updateLoadingBar(currentProgress);

        if (currentProgress >= 100) {
          window.clearInterval(interval);
        }
      }, 50);

      cleanups.push(() => window.clearInterval(interval));
    };

    const images = Array.from(document.images);
    const totalResources = Math.max(images.length, 1);
    let loadedResources = 0;

    const incrementProgress = () => {
      loadedResources += 1;
      const rawProgress = (loadedResources / totalResources) * 85;
      updateLoadingBar(Math.min(Math.round(rawProgress), 85));

      if (loadedResources >= totalResources) {
        finishLoading();
      }
    };

    updateLoadingBar(0);
    queueTimeout(() => updateLoadingBar(10), 100);
    queueTimeout(() => {
      minTimeElapsed = true;
      if (loadingProgress >= 100) {
        queueTimeout(startScreenAnimations, 500);
      }
    }, MINIMUM_LOADING_TIME);
    queueTimeout(() => {
      if (loadingProgress < 100) {
        updateLoadingBar(100);
      }
    }, FORCE_COMPLETE_TIME);

    if (images.length > 0) {
      images.forEach((image, index) => {
        if (image.complete && image.naturalWidth > 0) {
          queueTimeout(incrementProgress, index * 50);
          return;
        }

        let settled = false;
        const timeout = queueTimeout(() => {
          if (settled) return;
          settled = true;
          incrementProgress();
        }, 3000);
        const onDone = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          incrementProgress();
        };

        image.addEventListener("load", onDone, { once: true });
        image.addEventListener("error", onDone, { once: true });
        cleanups.push(() => {
          image.removeEventListener("load", onDone);
          image.removeEventListener("error", onDone);
        });
      });
    } else {
      let fakeProgress = 0;
      const interval = window.setInterval(() => {
        fakeProgress = Math.min(fakeProgress + 15, 100);
        updateLoadingBar(fakeProgress);

        if (fakeProgress >= 100) {
          window.clearInterval(interval);
        }
      }, 100);

      cleanups.push(() => window.clearInterval(interval));
    }

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <>
      <div className="loading-screen-content" aria-hidden="true">
        <div className="loading-bar-container">
          <div className="loading-bar" />
        </div>
      </div>
      <div className="loading-screen screen-1" aria-hidden="true" />
      <div className="loading-screen screen-2" aria-hidden="true" />
      <div className="loading-screen screen-3" aria-hidden="true" />
      <div className="loading-screen screen-4" aria-hidden="true" />
    </>
  );
}
