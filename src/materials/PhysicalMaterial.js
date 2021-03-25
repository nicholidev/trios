import { MeshPhysicalMaterial } from 'three';
import { propsValues } from '../tools';
import StandardMaterial from './StandardMaterial';

export default {
  extends: StandardMaterial,
  props: {
    flatShading: Boolean,
  },
  methods: {
    createMaterial() {
      this.material = new MeshPhysicalMaterial(propsValues(this.$props));
    },
    addWatchers() {
      // TODO
    },
  },
  __hmrId: 'PhysicalMaterial',
};
